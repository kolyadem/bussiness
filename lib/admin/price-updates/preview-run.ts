import { db } from "@/lib/db";
import { fetchRetailPage } from "@/lib/admin/price-updates/fetch-retail";
import { getPriceTrackingUrls } from "@/lib/admin/price-updates/metadata";
import { resolvePreviewMatch, type CatalogMatchInput } from "@/lib/admin/price-updates/preview-match";
import { mergeRetailAvailabilityCandidate } from "@/lib/admin/price-updates/availability-candidate";
import {
  displayUahToStoredPrice,
  markupDisplayPriceUah,
  pickBasePrice,
} from "@/lib/admin/price-updates/pricing";

export type CreatePreviewOptions = {
  createdByUserId: string | null;
  importSourceKey: string | null;
  limit: number;
};

export async function createPricePreviewRun(options: CreatePreviewOptions) {
  const { createdByUserId, importSourceKey, limit } = options;

  const products = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      ...(importSourceKey ? { importSourceKey } : {}),
    },
    take: Math.min(Math.max(limit, 1), 200),
    orderBy: { sku: "asc" },
    include: {
      translations: {
        where: { locale: "uk" },
        take: 1,
      },
      category: true,
      brand: {
        include: {
          translations: { where: { locale: "uk" }, take: 1 },
        },
      },
    },
  });

  return db.$transaction(async (tx) => {
    const run = await tx.priceUpdateRun.create({
      data: {
        status: "PREVIEW_READY",
        createdByUserId: createdByUserId ?? undefined,
      },
    });

    for (const p of products) {
      const name = p.translations[0]?.name ?? p.sku;
      const urls = getPriceTrackingUrls(p.metadata);

      let rozetkaPriceUah: number | null = null;
      let telemartPriceUah: number | null = null;
      let rozetkaHtml = "";
      let telemartHtml = "";
      let fetchNote = "";
      let rozetkaAvailability = "unknown";
      let telemartAvailability = "unknown";
      let rozetkaAvailRationale = "—";
      let telemartAvailRationale = "—";

      if (urls.rozetkaUrl) {
        const r = await fetchRetailPage(urls.rozetkaUrl);
        rozetkaPriceUah = r.uah;
        rozetkaHtml = r.html;
        rozetkaAvailability = r.availability.status;
        rozetkaAvailRationale = r.availability.rationale;
        if (r.error) {
          fetchNote += `Rozetka: ${r.error}. `;
        }
      }

      if (urls.telemartUrl) {
        const t = await fetchRetailPage(urls.telemartUrl);
        telemartPriceUah = t.uah;
        telemartHtml = t.html;
        telemartAvailability = t.availability.status;
        telemartAvailRationale = t.availability.rationale;
        if (t.error) {
          fetchNote += `Telemart: ${t.error}. `;
        }
      }

      const mergedAvail = mergeRetailAvailabilityCandidate({
        rozetka: rozetkaAvailability as "in_stock" | "out_of_stock" | "unknown",
        telemart: telemartAvailability as "in_stock" | "out_of_stock" | "unknown",
        hasRozetkaUrl: Boolean(urls.rozetkaUrl),
        hasTelemartUrl: Boolean(urls.telemartUrl),
      });
      const availabilityRationale = [
        `${mergedAvail.rationale}`,
        `Rozetka: ${rozetkaAvailRationale}`,
        `Telemart: ${telemartAvailRationale}`,
      ].join(" | ");

      if (!urls.rozetkaUrl && !urls.telemartUrl) {
        fetchNote = "No priceTracking.rozetkaUrl / telemartUrl in Product.metadata.";
      }

      const { baseUah, baseSource } = pickBasePrice(rozetkaPriceUah, telemartPriceUah);
      const markupUah = baseUah != null ? markupDisplayPriceUah(baseUah) : null;
      const newStored = markupUah != null ? displayUahToStoredPrice(markupUah) : null;

      const rozetkaOk = rozetkaPriceUah != null;
      const telemartOk = telemartPriceUah != null;

      const catalogInput: CatalogMatchInput = {
        categorySlug: p.category.slug,
        nameUk: name,
        productSlug: p.slug,
        brandSlug: p.brand.slug,
        brandNameUk: p.brand.translations[0]?.name ?? null,
        metadataJson: p.metadata,
        specsJson: p.specs,
        socket: p.socket,
        formFactor: p.formFactor,
        storageInterface: p.storageInterface,
        memoryCapacityGb: p.memoryCapacityGb,
      };

      const { lineStatus, confidence, matchNote } = resolvePreviewMatch({
        baseUah,
        catalog: catalogInput,
        rozetkaHtml,
        telemartHtml,
        rozetkaOk,
        telemartOk,
        fetchNote: fetchNote.trim(),
      });

      await tx.priceUpdateLine.create({
        data: {
          runId: run.id,
          productId: p.id,
          skuSnapshot: p.sku,
          nameSnapshot: name,
          currencySnapshot: p.currency,
          priceBeforeStored: p.price,
          rozetkaPriceUah,
          telemartPriceUah,
          baseSource,
          basePriceUah: baseUah,
          newPriceStored: newStored,
          rozetkaUrl: urls.rozetkaUrl,
          telemartUrl: urls.telemartUrl,
          matchNote,
          confidence,
          lineStatus,
          rozetkaAvailability,
          telemartAvailability,
          candidateAvailability: mergedAvail.candidate,
          availabilityRationale,
          inventoryStatusSnapshot: p.inventoryStatus,
        },
      });
    }

    return { runId: run.id, lineCount: products.length };
  });
}
