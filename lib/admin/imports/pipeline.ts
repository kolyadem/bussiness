import { defaultLocale, type AppLocale } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  createImportJob,
  createImportJobIssues,
  failImportJob,
  finalizeImportJob,
  markImportJobRunning,
} from "@/lib/admin/imports/persistence";
import {
  type ImportIssueSeverity,
  type ImportJobTrigger,
  type ImportMode,
  type ImportSourceType,
} from "@/lib/admin/imports/types";
import {
  type NormalizedProductPersistenceData,
  normalizeProductIngestPayload,
} from "@/lib/admin/product-ingest";
import {
  createProductRecord,
  updateProductRecord,
} from "@/lib/admin/product-persistence";
import { downloadRemoteProductImage } from "@/lib/admin/product-assets";
import { parseJson, slugify, STOREFRONT_CURRENCY_CODE } from "@/lib/utils";

type ImportPipelineInput = {
  startedByUserId?: string | null;
  sourceConfigId?: string | null;
  sourceKey?: string | null;
  sourceType: ImportSourceType;
  sourceUrl?: string | null;
  sourceFileName?: string | null;
  importMode: ImportMode;
  triggerType?: ImportJobTrigger;
  dryRun: boolean;
  timeoutMs?: number;
  retryCount?: number;
  maxRows?: number;
  maxPayloadBytes?: number;
  authHeaders?: Record<string, string>;
  rawContent?: string | null;
  skuFallbackEnabled?: boolean;
  slugFallbackEnabled?: boolean;
};

type PreparedImportRow = {
  rowIndex: number;
  rawIdentifier: string | null;
  sourceRecord: Record<string, unknown>;
  normalizedPayload?: NormalizedProductPersistenceData;
  existingProductId?: string | null;
  existingHeroImage?: string | null;
  existingGallery?: string | null;
  action?: "create" | "update" | "skip";
};

type ImportIssueInput = {
  rowIndex?: number | null;
  severity: ImportIssueSeverity;
  code: string;
  message: string;
  rawIdentifier?: string | null;
  details?: string;
};

type FetchResult = {
  content: string;
  payloadSizeBytes: number;
};

type ParseResult = {
  records: unknown[];
  parseError?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJsonSafely(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function stripCdata(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  result.push(current.trim());
  return result;
}

function parseCsvRecords(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function collectXmlNodes(content: string) {
  const tags = ["product", "item", "offer"];

  for (const tag of tags) {
    const matches = Array.from(content.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi")));

    if (matches.length > 0) {
      return matches.map((match) => match[1] ?? "");
    }
  }

  return [];
}

function readXmlTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripCdata(match[1] ?? "") : "";
}

function readXmlTagList(block: string, tag: string) {
  return Array.from(block.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi")))
    .map((match) => stripCdata(match[1] ?? ""))
    .filter(Boolean);
}

function parseXmlRecords(content: string) {
  const nodes = collectXmlNodes(content);

  return nodes.map((block) => ({
    externalId: readXmlTag(block, "externalId") || readXmlTag(block, "id"),
    sku: readXmlTag(block, "sku") || readXmlTag(block, "vendorCode"),
    slug: readXmlTag(block, "slug"),
    name: readXmlTag(block, "name") || readXmlTag(block, "title"),
    shortDescription: readXmlTag(block, "shortDescription") || readXmlTag(block, "summary"),
    description: readXmlTag(block, "description"),
    price: readXmlTag(block, "price"),
    oldPrice: readXmlTag(block, "oldPrice"),
    currency: readXmlTag(block, "currency"),
    stock: readXmlTag(block, "stock") || readXmlTag(block, "quantity"),
    inventoryStatus: readXmlTag(block, "inventoryStatus"),
    status: readXmlTag(block, "status"),
    brandSlug: readXmlTag(block, "brandSlug"),
    brandName: readXmlTag(block, "brand") || readXmlTag(block, "vendor"),
    categorySlug: readXmlTag(block, "categorySlug"),
    categoryName: readXmlTag(block, "category"),
    heroImage: readXmlTag(block, "heroImage") || readXmlTag(block, "picture"),
    gallery: readXmlTagList(block, "image").concat(readXmlTagList(block, "picture")),
  }));
}

function parseImportRecords(sourceType: ImportSourceType, content: string): ParseResult {
  if (sourceType === "UPLOAD_CSV") {
    return {
      records: parseCsvRecords(content),
    };
  }

  if (sourceType === "UPLOAD_XML" || sourceType === "FEED_URL") {
    const trimmed = content.trim();

    if (trimmed.startsWith("<")) {
      return {
        records: parseXmlRecords(trimmed),
      };
    }
  }

  const parsed = parseJsonSafely(content);

  if (Array.isArray(parsed)) {
    return {
      records: parsed,
    };
  }

  if (isRecord(parsed)) {
    const candidates = [parsed.items, parsed.products, parsed.offers, parsed.data];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return {
          records: candidate,
        };
      }
    }

    return {
      records: [],
      parseError: "JSON payload does not contain a supported product array",
    };
  }

  return {
    records: [],
    parseError: "Unsupported or malformed import payload",
  };
}

async function fetchRemoteContent(input: ImportPipelineInput): Promise<FetchResult> {
  if (!input.sourceUrl) {
    throw new Error("Source URL is required");
  }

  const maxPayloadBytes = input.maxPayloadBytes ?? 5_242_880;
  const retryCount = input.retryCount ?? 1;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 15000);

    try {
      const response = await fetch(input.sourceUrl, {
        headers: input.authHeaders,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Source responded with ${response.status}`);
      }

      const contentLength = Number(response.headers.get("content-length") ?? 0);

      if (contentLength > maxPayloadBytes) {
        throw new Error("Source payload exceeds configured size limit");
      }

      const text = await response.text();
      const payloadSizeBytes = Buffer.byteLength(text, "utf8");

      if (payloadSizeBytes > maxPayloadBytes) {
        throw new Error("Source payload exceeds configured size limit");
      }

      return {
        content: text,
        payloadSizeBytes,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Source fetch failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("Source fetch failed");
}

function getRowIdentifier(record: Record<string, unknown>) {
  const candidates = [
    record.externalId,
    record.sku,
    record.slug,
    record.id,
    record.code,
    record.name,
  ];

  for (const value of candidates) {
    const normalized = String(value ?? "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildTranslations(record: Record<string, unknown>) {
  const explicit = record.translations;

  if (Array.isArray(explicit)) {
    return explicit.map((item) => ({
      locale: String((item as Record<string, unknown>).locale ?? "").trim(),
      name: String((item as Record<string, unknown>).name ?? "").trim(),
      shortDescription: String((item as Record<string, unknown>).shortDescription ?? "").trim(),
      description: String((item as Record<string, unknown>).description ?? "").trim(),
      seoTitle: String((item as Record<string, unknown>).seoTitle ?? "").trim() || undefined,
      seoDescription:
        String((item as Record<string, unknown>).seoDescription ?? "").trim() || undefined,
    }));
  }

  if (isRecord(explicit)) {
    const supportedLocale = defaultLocale;
    const localized = explicit[supportedLocale];
    const localizedRecord = isRecord(localized) ? localized : {};
    return [
      {
        locale: supportedLocale,
        name: String(localizedRecord.name ?? record.name ?? "").trim(),
        shortDescription: String(
          localizedRecord.shortDescription ?? record.shortDescription ?? record.name ?? "",
        ).trim(),
        description: String(
          localizedRecord.description ??
            record.description ??
            record.shortDescription ??
            record.name ??
            "",
        ).trim(),
        seoTitle: String(localizedRecord.seoTitle ?? "").trim() || undefined,
        seoDescription: String(localizedRecord.seoDescription ?? "").trim() || undefined,
      },
    ];
  }

  const fallbackName = String(record.name ?? record.title ?? "").trim();
  const fallbackShort = String(record.shortDescription ?? record.summary ?? fallbackName).trim();
  const fallbackDescription = String(record.description ?? fallbackShort).trim();

  const supportedLocale = defaultLocale;
  return [
    {
      locale: supportedLocale,
      name: String(record[`name_${supportedLocale}`] ?? fallbackName).trim(),
      shortDescription: String(
        record[`shortDescription_${supportedLocale}`] ??
          record[`summary_${supportedLocale}`] ??
          fallbackShort,
      ).trim(),
      description: String(record[`description_${supportedLocale}`] ?? fallbackDescription).trim(),
      seoTitle: String(record[`seoTitle_${supportedLocale}`] ?? "").trim() || undefined,
      seoDescription: String(record[`seoDescription_${supportedLocale}`] ?? "").trim() || undefined,
    },
  ];
}

async function loadImportMaps() {
  const [brands, categories, products] = await Promise.all([
    db.brand.findMany({
      include: {
        translations: true,
      },
    }),
    db.category.findMany({
      include: {
        translations: true,
      },
    }),
    db.product.findMany({
      select: {
        id: true,
        sku: true,
        slug: true,
        externalId: true,
        importSourceKey: true,
        heroImage: true,
        gallery: true,
      },
    }),
  ]);

  const brandBySlug = new Map(brands.map((brand) => [brand.slug.toLowerCase(), brand.id] as const));
  const brandByName = new Map(
    brands.flatMap((brand) =>
      brand.translations.map((translation) => [translation.name.toLowerCase(), brand.id] as const),
    ),
  );
  const categoryBySlug = new Map(
    categories.map((category) => [category.slug.toLowerCase(), category.id] as const),
  );
  const categoryByName = new Map(
    categories.flatMap((category) =>
      category.translations.map(
        (translation) => [translation.name.toLowerCase(), category.id] as const,
      ),
    ),
  );
  const productByCompositeExternal = new Map(
    products
      .filter((product) => product.importSourceKey && product.externalId)
      .map((product) => [
        `${product.importSourceKey}::${product.externalId}`.toLowerCase(),
        product,
      ] as const),
  );
  const productBySku = new Map(products.map((product) => [product.sku.toUpperCase(), product] as const));
  const productBySlug = new Map(products.map((product) => [product.slug.toLowerCase(), product] as const));

  return {
    brandBySlug,
    brandByName,
    categoryBySlug,
    categoryByName,
    productByCompositeExternal,
    productBySku,
    productBySlug,
  };
}

function resolveRelationId(
  value: unknown,
  slugMap: Map<string, string>,
  nameMap: Map<string, string>,
) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return slugMap.get(normalized) ?? nameMap.get(normalized) ?? null;
}

function resolveExistingProduct(input: {
  sourceKey?: string | null;
  externalId?: string | null;
  sku?: string | null;
  slug?: string | null;
  maps: Awaited<ReturnType<typeof loadImportMaps>>;
  allowSkuFallback?: boolean;
  allowSlugFallback?: boolean;
}) {
  if (input.sourceKey && input.externalId) {
    const existing = input.maps.productByCompositeExternal.get(
      `${input.sourceKey}::${input.externalId}`.toLowerCase(),
    );

    if (existing) {
      return existing;
    }
  }

  if (input.allowSkuFallback && input.sku) {
    const existing = input.maps.productBySku.get(input.sku.toUpperCase());
    if (existing) {
      return existing;
    }
  }

  if (input.allowSlugFallback && input.slug) {
    return input.maps.productBySlug.get(input.slug.toLowerCase()) ?? null;
  }

  return null;
}

function normalizeSourceRecord(input: {
  record: Record<string, unknown>;
  rowIndex: number;
  locale: AppLocale;
  sourceKey?: string | null;
  importMode: ImportMode;
  maps: Awaited<ReturnType<typeof loadImportMaps>>;
  allowSkuFallback?: boolean;
  allowSlugFallback?: boolean;
}) {
  const issues: ImportIssueInput[] = [];
  const rawIdentifier = getRowIdentifier(input.record);
  const brandId = resolveRelationId(
    input.record.brandId ?? input.record.brandSlug ?? input.record.brandName ?? input.record.brand,
    input.maps.brandBySlug,
    input.maps.brandByName,
  );
  const categoryId = resolveRelationId(
    input.record.categoryId ??
      input.record.categorySlug ??
      input.record.categoryName ??
      input.record.category,
    input.maps.categoryBySlug,
    input.maps.categoryByName,
  );

  if (!brandId) {
    issues.push({
      rowIndex: input.rowIndex,
      severity: "ERROR",
      code: "BRAND_NOT_FOUND",
      message: "Brand could not be mapped",
      rawIdentifier,
    });
  }

  if (!categoryId) {
    issues.push({
      rowIndex: input.rowIndex,
      severity: "ERROR",
      code: "CATEGORY_NOT_FOUND",
      message: "Category could not be mapped",
      rawIdentifier,
    });
  }

  const translations = buildTranslations(input.record);
  const heroImage =
    String(input.record.heroImage ?? input.record.image ?? "").trim() ||
    normalizeStringList(input.record.gallery ?? input.record.images)[0] ||
    "";
  const gallery = Array.from(
    new Set(
      [heroImage, ...normalizeStringList(input.record.gallery ?? input.record.images)].filter(Boolean),
    ),
  );

  const resolvedSlug = slugify(
    String(input.record.slug ?? rawIdentifier ?? translations[0]?.name ?? "").trim(),
  );
  const resolvedSku = String(input.record.sku ?? "").trim().toUpperCase();
  const externalId = String(input.record.externalId ?? input.record.id ?? "").trim() || null;

  if (!resolvedSku) {
    issues.push({
      rowIndex: input.rowIndex,
      severity: "ERROR",
      code: "SKU_REQUIRED",
      message: "SKU is required",
      rawIdentifier,
    });
  }

  if (!resolvedSlug) {
    issues.push({
      rowIndex: input.rowIndex,
      severity: "ERROR",
      code: "SLUG_REQUIRED",
      message: "Slug could not be resolved",
      rawIdentifier,
    });
  }

  const existing = resolveExistingProduct({
    sourceKey: input.sourceKey,
    externalId,
    sku: resolvedSku || null,
    slug: resolvedSlug || null,
    maps: input.maps,
    allowSkuFallback: input.allowSkuFallback,
    allowSlugFallback: input.allowSlugFallback,
  });

  if (!heroImage && !existing) {
    issues.push({
      rowIndex: input.rowIndex,
      severity: "ERROR",
      code: "IMAGE_REQUIRED",
      message: "Hero image is required for new products",
      rawIdentifier,
    });
  }

  const normalized = normalizeProductIngestPayload({
    locale: input.locale,
    externalId,
    importSourceKey: input.sourceKey ?? null,
    slug: resolvedSlug,
    sku: resolvedSku,
    categoryId: categoryId ?? "",
    brandId: brandId ?? "",
    status: String(input.record.status ?? "PUBLISHED").trim().toUpperCase() || "PUBLISHED",
    price: String(input.record.price ?? ""),
    oldPrice:
      input.record.oldPrice === null || input.record.oldPrice === undefined
        ? null
        : String(input.record.oldPrice),
    currency: String(input.record.currency ?? STOREFRONT_CURRENCY_CODE).trim().toUpperCase(),
    inventoryStatus:
      String(input.record.inventoryStatus ?? (Number(input.record.stock ?? 0) > 0 ? "IN_STOCK" : "OUT_OF_STOCK"))
        .trim()
        .toUpperCase() || "IN_STOCK",
    stock: String(input.record.stock ?? "0"),
    heroImage: heroImage || existing?.heroImage || "",
    gallery: gallery.length > 0 ? gallery : [],
    specs: isRecord(input.record.specs) ? input.record.specs : {},
    metadata: isRecord(input.record.metadata) ? input.record.metadata : {},
    technicalAttributes: isRecord(input.record.technicalAttributes)
      ? Object.fromEntries(
          Object.entries(input.record.technicalAttributes).map(([key, value]) => [
            key,
            String(value ?? "").trim(),
          ]),
        )
      : {},
    translations,
  });

  if (!normalized.success) {
    issues.push({
      rowIndex: input.rowIndex,
      severity: "ERROR",
      code: "VALIDATION_FAILED",
      message: "Row failed product normalization",
      rawIdentifier,
      details: JSON.stringify(
        normalized.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      ),
    });
  }

  let action: "create" | "update" | "skip" = existing ? "update" : "create";

  if (input.importMode === "CREATE_ONLY" && existing) {
    action = "skip";
  }

  if (input.importMode === "UPDATE_EXISTING" && !existing) {
    action = "skip";
  }

  return {
    preparedRow: {
      rowIndex: input.rowIndex,
      rawIdentifier,
      sourceRecord: input.record,
      normalizedPayload: normalized.success ? normalized.data : undefined,
      existingProductId: existing?.id ?? null,
      existingHeroImage: existing?.heroImage ?? null,
      existingGallery: existing?.gallery ?? null,
      action,
    } satisfies PreparedImportRow,
    issues,
  };
}

async function persistPreparedRows(input: {
  rows: PreparedImportRow[];
  issueBuffer: ImportIssueInput[];
  importMode: ImportMode;
  sourceKey?: string | null;
  maxImageBytes?: number;
}) {
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const imageCache = new Map<string, string>();

  for (const row of input.rows) {
    if (!row.normalizedPayload) {
      failedCount += 1;
      continue;
    }

    if (row.action === "skip") {
      skippedCount += 1;
      continue;
    }

    try {
      const remoteImages = [row.normalizedPayload.heroImage, ...JSON.parse(row.normalizedPayload.gallery) as string[]]
        .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);

      const localizedImages: string[] = [];
      const existingGallery = row.existingGallery
        ? parseJson<string[]>(row.existingGallery, [])
        : [];

      for (const remoteImage of remoteImages) {
        if (remoteImage.startsWith("/uploads/") || remoteImage.startsWith("/products/")) {
          localizedImages.push(remoteImage);
          continue;
        }

        const cached = imageCache.get(remoteImage);

        if (cached) {
          localizedImages.push(cached);
          continue;
        }

        try {
          const uploaded = await downloadRemoteProductImage(remoteImage, {
            maxBytes: input.maxImageBytes ?? 5_242_880,
          });
          imageCache.set(remoteImage, uploaded);
          localizedImages.push(uploaded);
        } catch (error) {
          input.issueBuffer.push({
            rowIndex: row.rowIndex,
            severity: "WARNING",
            code: "IMAGE_FETCH_FAILED",
            message: error instanceof Error ? error.message : "Image download failed",
            rawIdentifier: row.rawIdentifier,
          });
        }
      }

      const fallbackImages =
        localizedImages.length > 0
          ? localizedImages
          : Array.from(
              new Set([row.existingHeroImage, ...existingGallery].filter(Boolean) as string[]),
            );
      const heroImage =
        fallbackImages[0] ??
        row.existingHeroImage ??
        row.normalizedPayload.heroImage;
      const payload = {
        ...row.normalizedPayload,
        heroImage,
        gallery: JSON.stringify(
          fallbackImages.length > 0 ? fallbackImages : [heroImage],
        ),
      };

      if (row.action === "create") {
        await createProductRecord(payload);
        createdCount += 1;
      } else if (row.action === "update" && row.existingProductId) {
        await updateProductRecord(row.existingProductId, payload);
        updatedCount += 1;
      } else {
        skippedCount += 1;
      }
    } catch (error) {
      failedCount += 1;
      input.issueBuffer.push({
        rowIndex: row.rowIndex,
        severity: "ERROR",
        code: "PERSIST_FAILED",
        message: error instanceof Error ? error.message : "Could not persist row",
        rawIdentifier: row.rawIdentifier,
      });
    }
  }

  if (
    input.sourceKey &&
    (input.importMode === "DISABLE_MISSING" || input.importMode === "MARK_MISSING_AS_DRAFT")
  ) {
    const externalIds = input.rows
      .map((row) => row.normalizedPayload?.externalId ?? null)
      .filter((value): value is string => Boolean(value));

    if (externalIds.length > 0) {
      await db.product.updateMany({
        where: {
          importSourceKey: input.sourceKey,
          externalId: {
            notIn: externalIds,
          },
        },
        data:
          input.importMode === "DISABLE_MISSING"
            ? {
                status: "ARCHIVED",
                inventoryStatus: "OUT_OF_STOCK",
                stock: 0,
              }
            : {
                status: "DRAFT",
              },
      });
    }
  }

  return {
    createdCount,
    updatedCount,
    skippedCount,
    failedCount,
  };
}

export async function runProductImport(input: ImportPipelineInput) {
  const issueBuffer: ImportIssueInput[] = [];
  const job = await createImportJob({
    sourceConfigId: input.sourceConfigId,
    startedByUserId: input.startedByUserId,
    sourceKey: input.sourceKey,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl,
    sourceFileName: input.sourceFileName,
    importMode: input.importMode,
    triggerType: input.triggerType ?? "MANUAL",
    dryRun: input.dryRun,
    sourceMeta: JSON.stringify({
      sourceUrl: input.sourceUrl ?? null,
      sourceFileName: input.sourceFileName ?? null,
    }),
  });

  try {
    await markImportJobRunning(job.id);

    const fetchResult =
      typeof input.rawContent === "string"
        ? {
            content: input.rawContent,
            payloadSizeBytes: Buffer.byteLength(input.rawContent, "utf8"),
          }
        : await fetchRemoteContent(input);
    const maxPayloadBytes = input.maxPayloadBytes ?? 5_242_880;

    if (fetchResult.payloadSizeBytes > maxPayloadBytes) {
      issueBuffer.push({
        severity: "ERROR",
        code: "PAYLOAD_TOO_LARGE",
        message: `Source payload exceeds the ${maxPayloadBytes} byte limit`,
      });
    }

    const parsed = parseImportRecords(input.sourceType, fetchResult.content);
    const parsedRecords = parsed.records;
    const maxRows = input.maxRows ?? 500;

    if (parsed.parseError) {
      issueBuffer.push({
        severity: "ERROR",
        code: "PARSE_FAILED",
        message: parsed.parseError,
      });
    }

    if (parsedRecords.length === 0) {
      issueBuffer.push({
        severity: "ERROR",
        code: "PARSE_EMPTY",
        message: "Source did not contain importable rows",
      });
    }

    if (parsedRecords.length > maxRows) {
      issueBuffer.push({
        severity: "ERROR",
        code: "MAX_ROWS_EXCEEDED",
        message: `Source contains ${parsedRecords.length} rows which exceeds the ${maxRows} row limit`,
      });
    }

    if (issueBuffer.some((issue) => issue.severity === "ERROR" && issue.rowIndex == null)) {
      await createImportJobIssues(job.id, issueBuffer);
      await finalizeImportJob({
        jobId: job.id,
        status: "FAILED",
        totalRows: parsedRecords.length,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        failedCount: parsedRecords.length,
        warningCount: issueBuffer.filter((issue) => issue.severity === "WARNING").length,
        errorCount: issueBuffer.filter((issue) => issue.severity === "ERROR").length,
        report: JSON.stringify({ payloadSizeBytes: fetchResult.payloadSizeBytes }),
      });

      return {
        jobId: job.id,
        ok: false as const,
      };
    }

    const maps = await loadImportMaps();
    const preparedRows = parsedRecords.map((record, index) =>
      normalizeSourceRecord({
        record: isRecord(record) ? record : { value: record },
        rowIndex: index + 1,
        locale: "uk",
        sourceKey: input.sourceKey,
        importMode: input.importMode,
        maps,
        allowSkuFallback: input.skuFallbackEnabled ?? false,
        allowSlugFallback: input.slugFallbackEnabled ?? false,
      }),
    );

    for (const prepared of preparedRows) {
      issueBuffer.push(...prepared.issues);
    }

    const rows = preparedRows.map((prepared) => prepared.preparedRow);
    const totalRows = rows.length;
    const previewCounts = {
      createdCount: rows.filter((row) => row.action === "create" && row.normalizedPayload).length,
      updatedCount: rows.filter((row) => row.action === "update" && row.normalizedPayload).length,
      skippedCount:
        rows.filter((row) => row.action === "skip").length +
        rows.filter((row) => !row.normalizedPayload).length,
      failedCount: new Set(
        issueBuffer
          .filter((issue) => issue.severity === "ERROR" && issue.rowIndex != null)
          .map((issue) => issue.rowIndex),
      ).size,
    };

    if (input.dryRun) {
      await createImportJobIssues(job.id, issueBuffer);
      await finalizeImportJob({
        jobId: job.id,
        status:
          issueBuffer.some((issue) => issue.severity === "ERROR" && issue.rowIndex != null)
            ? "PARTIAL_SUCCESS"
            : "SUCCESS",
        totalRows,
        createdCount: previewCounts.createdCount,
        updatedCount: previewCounts.updatedCount,
        skippedCount: previewCounts.skippedCount,
        failedCount: previewCounts.failedCount,
        warningCount: issueBuffer.filter((issue) => issue.severity === "WARNING").length,
        errorCount: issueBuffer.filter((issue) => issue.severity === "ERROR").length,
        report: JSON.stringify({
          payloadSizeBytes: fetchResult.payloadSizeBytes,
          mode: "preview",
        }),
      });

      return {
        jobId: job.id,
        ok: true as const,
        preview: {
          totalRows,
          ...previewCounts,
          warnings: issueBuffer.filter((issue) => issue.severity === "WARNING"),
          errors: issueBuffer.filter((issue) => issue.severity === "ERROR"),
        },
      };
    }

    const persisted = await persistPreparedRows({
      rows,
      issueBuffer,
      importMode: input.importMode,
      sourceKey: input.sourceKey,
      maxImageBytes: input.maxPayloadBytes,
    });

    await createImportJobIssues(job.id, issueBuffer);

    const errorCount = issueBuffer.filter((issue) => issue.severity === "ERROR").length;
    const warningCount = issueBuffer.filter((issue) => issue.severity === "WARNING").length;

    await finalizeImportJob({
      jobId: job.id,
      status: errorCount > 0 ? "PARTIAL_SUCCESS" : "SUCCESS",
      totalRows,
      createdCount: persisted.createdCount,
      updatedCount: persisted.updatedCount,
      skippedCount: persisted.skippedCount,
      failedCount: persisted.failedCount,
      warningCount,
      errorCount,
      report: JSON.stringify({
        payloadSizeBytes: fetchResult.payloadSizeBytes,
        mode: "persist",
      }),
    });

    return {
      jobId: job.id,
      ok: true as const,
      preview: {
        totalRows,
        createdCount: persisted.createdCount,
        updatedCount: persisted.updatedCount,
        skippedCount: persisted.skippedCount,
        failedCount: persisted.failedCount,
        warnings: issueBuffer.filter((issue) => issue.severity === "WARNING"),
        errors: issueBuffer.filter((issue) => issue.severity === "ERROR"),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import job failed";
    await failImportJob(job.id, message);
    await createImportJobIssues(job.id, [
      {
        severity: "ERROR",
        code: "JOB_FATAL",
        message,
      },
    ]);

    return {
      jobId: job.id,
      ok: false as const,
      error: message,
    };
  }
}
