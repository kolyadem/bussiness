import { db } from "@/lib/db";
import { ensureSessionId, getSessionId } from "@/lib/session";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  evaluateBuildCompatibility,
  evaluateCandidateCompatibility,
  getCompatibilityRulesForRequest,
  isCompatibilityFilterAvailable,
  type CompatibilityBuild,
} from "@/lib/compatibility";
import { getCompatibilityFallbackMessage } from "@/lib/compatibility/messages";
import type { AppLocale } from "@/lib/constants";
import { getNormalizedTechnicalAttributeMap } from "@/lib/configurator/technical-attributes";
import {
  buildConfiguratorSlugCandidate,
  getConfiguratorDefaultName,
  getConfiguratorShareHref,
  getConfiguratorSlotDefinition,
  getConfiguratorSlotDescription,
  getConfiguratorSlotLabel,
  getConfiguratorSlots,
  isConfiguratorSlotKey,
  matchConfiguratorSlotKeywords,
  type ConfiguratorSlotKey,
} from "@/lib/storefront/configurator";
import { addProductToOwnedCart, resolveStorefrontOwner } from "@/lib/storefront/persistence";
import { mapProduct } from "@/lib/storefront/queries";
import type { ProductRecord } from "@/lib/storefront/types";

export const configuratorSelectionSortOptions = [
  "featured",
  "price-asc",
  "price-desc",
  "rating",
] as const;

export type ConfiguratorSelectionSort = (typeof configuratorSelectionSortOptions)[number];
export type ConfiguratorVendorFilter = "intel" | "amd" | "nvidia";
export type ConfiguratorMemoryTypeFilter = "DDR4" | "DDR5";

const configuratorProductInclude = {
  translations: true,
  attributes: {
    include: {
      attribute: true,
    },
  },
  brand: {
    include: {
      translations: true,
    },
  },
  category: {
    include: {
      translations: true,
    },
  },
  reviews: {
    where: {
      status: "APPROVED",
    },
    orderBy: {
      createdAt: "desc" as const,
    },
  },
} as const;

/** Narrower include for slot selection list (same downstream logic; less DB payload). */
const configuratorSlotSelectionInclude = {
  translations: true,
  attributes: {
    include: {
      attribute: {
        select: {
          code: true,
        },
      },
    },
  },
  brand: {
    include: {
      translations: true,
    },
  },
  category: {
    include: {
      translations: true,
    },
  },
  reviews: {
    where: {
      status: "APPROVED",
    },
    select: {
      rating: true,
    },
  },
} as const;

async function getConfiguratorOwner() {
  const [viewer, sessionId] = await Promise.all([getAuthenticatedUser(), getSessionId()]);

  return {
    userId: viewer?.id ?? null,
    sessionId,
  };
}

async function ensureConfiguratorOwner() {
  const viewer = await getAuthenticatedUser();
  const sessionId = await ensureSessionId();

  return {
    userId: viewer?.id ?? null,
    sessionId,
  };
}

function buildOwnerWhere(userId: string | null, sessionId: string | null) {
  const clauses = [
    ...(userId ? [{ userId }] : []),
    ...(sessionId ? [{ sessionId }] : []),
  ];

  if (clauses.length === 0) {
    return {
      id: "__no-build__",
    };
  }

  return {
    OR: clauses,
  };
}

async function generateUniqueBuildSlug(name: string, locale: AppLocale, excludeBuildId?: string) {
  const base = buildConfiguratorSlugCandidate(name, locale);
  let candidate = base;
  let attempt = 1;

  while (true) {
    const existing = await db.pcBuild.findFirst({
      where: {
        slug: candidate,
        ...(excludeBuildId ? { id: { not: excludeBuildId } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }

    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
}

async function generateUniqueShareToken() {
  while (true) {
    const candidate = crypto.randomUUID().replace(/-/g, "");
    const existing = await db.pcBuild.findFirst({
      where: { shareToken: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }
}

async function recalculateBuildTotal(buildId: string) {
  const items = await db.pcBuildItem.findMany({
    where: {
      buildId,
    },
    include: {
      product: {
        select: {
          price: true,
        },
      },
    },
  });

  const totalPrice = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  await db.pcBuild.update({
    where: { id: buildId },
    data: {
      totalPrice,
    },
  });

  return totalPrice;
}

async function mapBuildRecord(
  build: Awaited<ReturnType<typeof getConfiguratorBuildRecord>>,
  locale: AppLocale,
) {
  if (!build) {
    return null;
  }

  const itemsBySlot = Object.fromEntries(
    getConfiguratorSlots().map((slot) => [slot.key, null]),
  ) as Record<
    ConfiguratorSlotKey,
    | null
    | {
        id: string;
        slot: ConfiguratorSlotKey;
        quantity: number;
        product: ReturnType<typeof mapProduct>;
      }
  >;

  for (const item of build.items) {
    if (!isConfiguratorSlotKey(item.slot)) {
      continue;
    }

    itemsBySlot[item.slot] = {
      id: item.id,
      slot: item.slot,
      quantity: item.quantity,
      product: mapProduct(item.product, locale),
    };
  }

  const filledItems = Object.values(itemsBySlot).filter(Boolean);

  const compatibilityBuild = {
    itemsBySlot,
  } satisfies CompatibilityBuild;
  const compatibility = await evaluateBuildCompatibility(compatibilityBuild, locale);

  return {
    id: build.id,
    slug: build.slug,
    name: build.name,
    locale: build.locale,
    notes: build.notes,
    shareToken: build.shareToken,
    shareHref: getConfiguratorShareHref(locale, build.shareToken),
    totalPrice: build.totalPrice,
    updatedAt: build.updatedAt,
    itemCount: filledItems.length,
    itemsBySlot,
    compatibility,
  };
}

async function getConfiguratorBuildRecord(slug: string) {
  const owner = await getConfiguratorOwner();

  return db.pcBuild.findFirst({
    where: {
      slug,
      ...buildOwnerWhere(owner.userId, owner.sessionId),
    },
    include: {
      items: {
        include: {
          product: {
            include: configuratorProductInclude,
          },
        },
        orderBy: {
          id: "asc",
        },
      },
    },
  });
}

export async function getConfiguratorBuild(slug: string, locale: AppLocale) {
  const build = await getConfiguratorBuildRecord(slug);
  return mapBuildRecord(build, locale);
}

export async function getSharedConfiguratorBuild(shareToken: string, locale: AppLocale) {
  const build = await db.pcBuild.findFirst({
    where: { shareToken },
    include: {
      items: {
        include: {
          product: {
            include: configuratorProductInclude,
          },
        },
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  return mapBuildRecord(build, locale);
}

export async function createConfiguratorBuild({
  locale,
  name,
}: {
  locale: AppLocale;
  name?: string;
}) {
  const owner = await ensureConfiguratorOwner();
  const resolvedName = name?.trim() || getConfiguratorDefaultName(locale);
  const [slug, shareToken] = await Promise.all([
    generateUniqueBuildSlug(resolvedName, locale),
    generateUniqueShareToken(),
  ]);

  const build = await db.pcBuild.create({
    data: {
      name: resolvedName,
      slug,
      locale,
      shareToken,
      sessionId: owner.sessionId,
      userId: owner.userId,
    },
    include: {
      items: {
        include: {
          product: {
            include: configuratorProductInclude,
          },
        },
      },
    },
  });

  return mapBuildRecord(build, locale);
}

export async function updateConfiguratorBuildName({
  slug,
  locale,
  name,
}: {
  slug: string;
  locale: AppLocale;
  name: string;
}) {
  const build = await getConfiguratorBuildRecord(slug);

  if (!build) {
    return null;
  }

  const resolvedName = name.trim() || getConfiguratorDefaultName(locale);
  const nextSlug =
    resolvedName === build.name ? build.slug : await generateUniqueBuildSlug(resolvedName, locale, build.id);

  const updated = await db.pcBuild.update({
    where: {
      id: build.id,
    },
    data: {
      name: resolvedName,
      slug: nextSlug,
    },
    include: {
      items: {
        include: {
          product: {
            include: configuratorProductInclude,
          },
        },
      },
    },
  });

  return mapBuildRecord(updated, locale);
}

export async function removeConfiguratorSlotItem({
  slug,
  slot,
  locale,
}: {
  slug: string;
  slot: ConfiguratorSlotKey;
  locale: AppLocale;
}) {
  const build = await getConfiguratorBuildRecord(slug);

  if (!build) {
    return null;
  }

  await db.pcBuildItem.deleteMany({
    where: {
      buildId: build.id,
      slot,
    },
  });

  await recalculateBuildTotal(build.id);

  return getConfiguratorBuild(build.slug, locale);
}

export async function setConfiguratorSlotItem({
  slug,
  slot,
  productId,
  locale,
}: {
  slug: string;
  slot: ConfiguratorSlotKey;
  productId: string;
  locale: AppLocale;
}) {
  const build = await getConfiguratorBuildRecord(slug);

  if (!build) {
    return null;
  }

  const product = await db.product.findFirst({
    where: {
      id: productId,
      status: "PUBLISHED",
    },
    include: {
      brand: {
        include: {
          translations: true,
        },
      },
      category: {
        include: {
          translations: true,
        },
      },
      attributes: {
        include: {
          attribute: true,
        },
      },
      reviews: {
        where: {
          status: "APPROVED",
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      translations: true,
    },
  });

  if (!product) {
    throw new Error("Товар не знайдено");
  }

  const localizedNames = product.translations.map((translation) => translation.name.toLowerCase());

  if (!matchConfiguratorSlotKeywords(slot, localizedNames, product.category.slug)) {
    throw new Error("Товар не підходить для цього слота");
  }

  const buildView = await mapBuildRecord(build, locale);

  if (!buildView) {
    throw new Error("Збірку не знайдено");
  }

  const rules = await getCompatibilityRulesForRequest();
  const compatibility = await evaluateCandidateCompatibility({
    build: buildView,
    slot,
    locale,
    candidate: {
      ...mapProduct(product, locale),
      technicalAttributes: getNormalizedTechnicalAttributeMap(product),
    },
    rules,
  });

  if (compatibility.status === "fail") {
    throw new Error(
      compatibility.errors[0]?.message ||
        getCompatibilityFallbackMessage("candidate_incompatible", locale),
    );
  }

  await db.pcBuildItem.upsert({
    where: {
      buildId_slot: {
        buildId: build.id,
        slot,
      },
    },
    update: {
      productId,
      quantity: 1,
    },
    create: {
      buildId: build.id,
      productId,
      slot,
      quantity: 1,
    },
  });

  await recalculateBuildTotal(build.id);

  return getConfiguratorBuild(build.slug, locale);
}

export async function addConfiguratorBuildToCart(slug: string) {
  const build = await getConfiguratorBuildRecord(slug);

  if (!build) {
    return null;
  }

  const buildView = await mapBuildRecord(build, build.locale as AppLocale);

  if (!buildView) {
    return null;
  }

  if (buildView.compatibility.status === "fail") {
    throw new Error(
      buildView.compatibility.errors[0]?.message ||
        getCompatibilityFallbackMessage("build_incompatible", build.locale as AppLocale),
    );
  }

  const owner = await resolveStorefrontOwner({ ensureSession: true });

  for (const item of build.items) {
    await addProductToOwnedCart({
      owner,
      productId: item.productId,
      quantity: item.quantity,
      configuration: JSON.stringify({
          type: "pc-build",
          buildSlug: build.slug,
          buildName: build.name,
          slot: item.slot,
      }),
    });
  }

  const ownedCart = await db.cart.findFirst({
    where: owner.userId ? { userId: owner.userId } : { sessionId: owner.sessionId! },
    include: {
      items: {
        include: {
          product: {
            select: {
              price: true,
            },
          },
        },
      },
    },
  });

  return {
    addedItems: build.items.length,
    count: ownedCart?.items.length ?? 0,
    itemCount: ownedCart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    subtotal:
      ownedCart?.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0) ?? 0,
  };
}

type ConfiguratorSelectionProduct = ReturnType<typeof mapProduct> & {
  compatibility?: Awaited<ReturnType<typeof evaluateCandidateCompatibility>>;
};

function matchesConfiguratorVendor(
  product: ConfiguratorSelectionProduct,
  vendor: ConfiguratorVendorFilter,
) {
  const haystack = `${product.category.slug} ${product.category.name}`.toLowerCase();
  return haystack.includes(vendor);
}

function matchesConfiguratorMemoryType(
  product: ConfiguratorSelectionProduct,
  slot: ConfiguratorSlotKey,
  memoryType: ConfiguratorMemoryTypeFilter,
) {
  const normalized = memoryType.toLowerCase();
  const code = slot === "motherboard" ? "motherboard.memory_type" : "ram.memory_type";
  return typeof product.technicalAttributes?.[code] === "string"
    ? String(product.technicalAttributes?.[code]).trim().toLowerCase() === normalized
    : false;
}

function sortConfiguratorProducts(
  products: ConfiguratorSelectionProduct[],
  sort: ConfiguratorSelectionSort,
) {
  const sorted = [...products];

  switch (sort) {
    case "price-asc":
      return sorted.sort((left, right) => left.price - right.price || right.stock - left.stock);
    case "price-desc":
      return sorted.sort((left, right) => right.price - left.price || right.stock - left.stock);
    case "rating":
      return sorted.sort((left, right) => right.rating - left.rating || right.stock - left.stock);
    case "featured":
    default:
      return sorted.sort((left, right) => right.stock - left.stock || right.rating - left.rating);
  }
}

export async function isConfiguratorCompatibleFilterAvailable(
  slot: ConfiguratorSlotKey,
  build: Awaited<ReturnType<typeof getConfiguratorBuild>>,
) {
  const rules = await getCompatibilityRulesForRequest();
  return build ? isCompatibilityFilterAvailable(slot, build, rules) : false;
}

export async function getConfiguratorProductsForSlot({
  slot,
  locale,
  search = "",
  buildSlug,
  vendor,
  memoryType,
  compatibleOnly = false,
  sort = "featured",
}: {
  slot: ConfiguratorSlotKey;
  locale: AppLocale;
  search?: string;
  buildSlug?: string | null;
  vendor?: ConfiguratorVendorFilter | null;
  memoryType?: ConfiguratorMemoryTypeFilter | null;
  compatibleOnly?: boolean;
  sort?: ConfiguratorSelectionSort;
}) {
  const definition = getConfiguratorSlotDefinition(slot);

  if (definition.categorySlugs.length === 0) {
    return [];
  }

  const [products, build, rules] = await Promise.all([
    db.product.findMany({
    where: {
      status: "PUBLISHED",
      category: {
        slug: {
          in: definition.categorySlugs,
        },
      },
      ...(search.trim().length > 0
        ? {
            OR: [
              { sku: { contains: search.trim() } },
              {
                translations: {
                  some: {
                    locale,
                    name: {
                      contains: search.trim(),
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: configuratorSlotSelectionInclude,
    orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
  }),
    buildSlug ? getConfiguratorBuild(buildSlug, locale) : Promise.resolve(null),
    getCompatibilityRulesForRequest(),
  ]);

  const mappedProducts = products
    .filter((product) =>
      matchConfiguratorSlotKeywords(
        slot,
        product.translations.map((translation) => translation.name.toLowerCase()),
        product.category.slug,
      ),
    )
    .map((product) => ({
      ...mapProduct(product as ProductRecord, locale),
      technicalAttributes: getNormalizedTechnicalAttributeMap(product as ProductRecord),
    }))
    .filter((product) => (vendor ? matchesConfiguratorVendor(product, vendor) : true))
    .filter((product) =>
      memoryType && (slot === "motherboard" || slot === "ram")
        ? matchesConfiguratorMemoryType(product, slot, memoryType)
        : true,
    );

  const compatibilityFilterAvailable = build
    ? await isCompatibilityFilterAvailable(slot, build, rules)
    : false;

  const productsWithCompatibility = await Promise.all(
    mappedProducts.map(async (product) => {
      const compatibility =
        build && compatibilityFilterAvailable
          ? await evaluateCandidateCompatibility({
              build,
              slot,
              locale,
              candidate: product,
              rules,
            })
          : undefined;

      return {
        ...product,
        compatibility,
      };
    }),
  );

  const filteredProducts = compatibleOnly
    ? productsWithCompatibility.filter((product) => product.compatibility?.status !== "fail")
    : productsWithCompatibility;

  return sortConfiguratorProducts(filteredProducts, sort);
}

export function getConfiguratorSlotView(locale: AppLocale) {
  return getConfiguratorSlots().map((slot) => ({
    key: slot.key,
    group: slot.group,
    label: getConfiguratorSlotLabel(slot.key, locale),
    description: getConfiguratorSlotDescription(slot.key, locale),
    hasChoices: slot.categorySlugs.length > 0,
  }));
}
