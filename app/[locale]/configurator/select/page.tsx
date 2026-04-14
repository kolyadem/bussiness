import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfiguratorSlotSelection } from "@/components/configurator/configurator-slot-selection";
import type { AppLocale } from "@/lib/constants";
import { isConfiguratorSlotKey } from "@/lib/storefront/configurator";
import { CONFIGURATOR_SELECT_PAGE } from "@/lib/storefront/configurator-selection-url";
import { pageMetadata } from "@/lib/storefront/seo";

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(
    locale,
    "catalogSeoTitle",
    "Вибір компонента для конфігуратора ПК.",
    "/configurator/select",
    {
      title: "Вибір компонента",
      indexable: false,
    },
  );
}

export default async function ConfiguratorSelectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const slot = getFirst(rawSearchParams.slot);

  if (!isConfiguratorSlotKey(slot)) {
    notFound();
  }

  return (
    <main className="storefront-shell mx-auto w-full max-w-[1640px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <ConfiguratorSlotSelection locale={locale} location={CONFIGURATOR_SELECT_PAGE} rawSearchParams={rawSearchParams} />
    </main>
  );
}
