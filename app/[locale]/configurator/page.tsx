import type { Metadata } from "next";
import { ConfiguratorBuilder } from "@/components/configurator/configurator-builder";
import type { AppLocale } from "@/lib/constants";
import { getConfiguratorBuildRequestPrefill } from "@/lib/storefront/build-request-data";
import {
  getConfiguratorBuild,
  getConfiguratorSlotView,
} from "@/lib/storefront/configurator-data";
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
    locale === "uk"
      ? "Конфігуратор ПК для поетапного складання системи."
      : locale === "ru"
        ? "Конфигуратор ПК для пошаговой сборки системы."
        : "PC Configurator for building a system step by step.",
    "/configurator",
    {
      title:
        locale === "uk"
          ? "Конфігуратор ПК"
          : locale === "ru"
            ? "Конфигуратор ПК"
            : "PC Configurator",
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
  const [build, slots, requestPrefill] = await Promise.all([
    buildSlug ? getConfiguratorBuild(buildSlug, locale) : Promise.resolve(null),
    Promise.resolve(getConfiguratorSlotView(locale)),
    getConfiguratorBuildRequestPrefill(),
  ]);

  return (
    <main className="storefront-shell mx-auto w-full px-4 py-8 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <ConfiguratorBuilder
        locale={locale}
        build={build}
        slots={slots}
        requestPrefill={requestPrefill}
      />
    </main>
  );
}
