import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ConfiguratorBuilder } from "@/components/configurator/configurator-builder";
import { ConfiguratorScrollToPicker } from "@/components/configurator/configurator-scroll-to-picker";
import { ConfiguratorSlotSelection } from "@/components/configurator/configurator-slot-selection";
import type { AppLocale } from "@/lib/constants";
import { isConfiguratorSlotKey } from "@/lib/storefront/configurator";
import { getConfiguratorBuildRequestPrefill } from "@/lib/storefront/build-request-data";
import {
  getConfiguratorBuild,
  getConfiguratorSlotView,
} from "@/lib/storefront/configurator-data";
import { CONFIGURATOR_EMBED_PAGE } from "@/lib/storefront/configurator-selection-url";
import { getSiteSettingsRecord } from "@/lib/site-config";
import { getCart } from "@/lib/storefront/queries";
import { pageMetadata } from "@/lib/storefront/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const t = await getTranslations({ locale });

  return pageMetadata(
    locale,
    "homeSeoTitle",
    t("configuratorSeoDescription"),
    "/configurator",
    {
      title: t("configuratorTitle"),
    },
  );
}

export default async function ConfiguratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const buildSlug = Array.isArray(rawSearchParams.build)
    ? rawSearchParams.build[0]
    : rawSearchParams.build;
  const pickRaw = Array.isArray(rawSearchParams.pick) ? rawSearchParams.pick[0] : rawSearchParams.pick;
  const showInlinePicker = pickRaw ? isConfiguratorSlotKey(pickRaw) : false;

  const [build, slots, requestPrefill, cart, siteSettings] = await Promise.all([
    buildSlug ? getConfiguratorBuild(buildSlug, locale) : Promise.resolve(null),
    Promise.resolve(getConfiguratorSlotView(locale)),
    getConfiguratorBuildRequestPrefill(),
    getCart(),
    getSiteSettingsRecord(),
  ]);
  const cartItemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <main className="storefront-shell mx-auto w-full px-4 py-6 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <Suspense fallback={null}>
        <ConfiguratorScrollToPicker />
      </Suspense>
      {showInlinePicker ? (
        <div id="configurator-picker" className="mb-8 scroll-mt-[calc(var(--header-offset)+1rem)]">
          <ConfiguratorSlotSelection locale={locale} location={CONFIGURATOR_EMBED_PAGE} rawSearchParams={rawSearchParams} />
        </div>
      ) : null}
      <ConfiguratorBuilder
        locale={locale}
        build={build}
        slots={slots}
        requestPrefill={requestPrefill}
        cartItemCount={cartItemCount}
        assemblyBaseFeeUah={siteSettings?.assemblyBaseFeeUah ?? 0}
        assemblyPercent={siteSettings?.assemblyPercent ?? 0}
      />
    </main>
  );
}
