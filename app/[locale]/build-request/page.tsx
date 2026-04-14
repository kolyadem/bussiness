import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuickBuildRequestForm } from "@/components/build-requests/quick-build-request-form";
import type { AppLocale } from "@/lib/constants";
import { getSiteMode, getSiteSettingsRecord } from "@/lib/site-config";
import { SITE_MODES } from "@/lib/site-mode";
import { getConfiguratorBuildRequestPrefill } from "@/lib/storefront/build-request-data";
import { pageMetadata } from "@/lib/storefront/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(
    locale,
    "homeSeoTitle",
    "Запит на підбір ПК під бюджет і задачі.",
    "/build-request",
    {
      title: "Запит на підбір ПК",
      indexable: false,
    },
  );
}

export default async function BuildRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const [siteMode, siteSettings, prefill, rawSearchParams] = await Promise.all([
    getSiteMode(),
    getSiteSettingsRecord(),
    getConfiguratorBuildRequestPrefill(),
    searchParams,
  ]);

  if (siteMode !== SITE_MODES.pcBuild) {
    notFound();
  }

  const sourceParam = rawSearchParams.source;
  const source =
    typeof sourceParam === "string"
      ? sourceParam
      : Array.isArray(sourceParam)
        ? sourceParam[0] ?? ""
        : "";

  return (
    <main className="storefront-shell mx-auto w-full px-4 py-8 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <QuickBuildRequestForm
        locale={locale}
        initialValues={{
          fullName: prefill.fullName,
          contact: prefill.phone || prefill.email || "",
          telegramUsername: "",
          budget: "",
          useCase: "",
          preferences: "",
          needsMonitor: false,
          needsPeripherals: false,
          needsUpgrade: false,
          source,
          website: "",
          promoCode: "",
        }}
        supportEmail={siteSettings?.supportEmail ?? null}
        supportPhone={siteSettings?.supportPhone ?? null}
        telegramUrl={siteSettings?.telegramUrl ?? null}
      />
    </main>
  );
}
