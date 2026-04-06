import { updateSiteSettingsAction } from "@/app/actions/admin";
import { AdminSiteSettingsForm } from "@/components/admin/admin-site-settings-form";
import {
  getAdminProductOptions,
  getAdminProducts,
  getAdminSiteSettings,
  requireAdminOnlyAccess,
} from "@/lib/admin";
import { normalizeSiteMode } from "@/lib/site-mode";
import { parseJson, STOREFRONT_CURRENCY_CODE } from "@/lib/utils";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminOnlyAccess(locale);
  const [settings, options, products] = await Promise.all([
    getAdminSiteSettings(),
    getAdminProductOptions(),
    getAdminProducts("ADMIN"),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          Налаштування сайту
        </h2>
      </section>
      <AdminSiteSettingsForm
        locale={locale}
        action={updateSiteSettingsAction}
        categories={options.categories}
        products={products}
        initialValues={{
          siteMode: normalizeSiteMode(settings?.siteMode),
          brandName: settings?.brandName ?? "Lumina Tech",
          shortBrandName: settings?.shortBrandName ?? "",
          logoText: settings?.logoText ?? "",
          logoPath: settings?.logoPath ?? "",
          supportEmail: settings?.supportEmail ?? "",
          supportPhone: settings?.supportPhone ?? "",
          address: settings?.address ?? "",
          facebookUrl: settings?.facebookUrl ?? "",
          instagramUrl: settings?.instagramUrl ?? "",
          telegramUrl: settings?.telegramUrl ?? "",
          youtubeUrl: settings?.youtubeUrl ?? "",
          metaTitle: settings?.metaTitle ?? "",
          metaDescription: settings?.metaDescription ?? "",
          faviconPath: settings?.faviconPath ?? "",
          defaultCurrency: settings?.defaultCurrency ?? STOREFRONT_CURRENCY_CODE,
          defaultLocale: settings?.defaultLocale ?? "uk",
          watermarkText: settings?.watermarkText ?? "LUMINA",
          heroTitle: settings?.heroTitle ?? "",
          heroSubtitle: settings?.heroSubtitle ?? "",
          heroCtaLabel: settings?.heroCtaLabel ?? "",
          heroCtaHref: settings?.heroCtaHref ?? "",
          featuredCategorySlugs: settings ? parseJson<string[]>(settings.featuredCategorySlugs, []) : [],
          featuredProductIds: settings ? parseJson<string[]>(settings.featuredProductIds, []) : [],
        }}
      />
    </div>
  );
}
