import { notFound } from "next/navigation";
import { updateBannerAction } from "@/app/actions/admin";
import { AdminBannerForm } from "@/components/admin/admin-banner-form";
import { getAdminBannerById, getAdminBannerLocaleFields, requireAdminOnlyAccess } from "@/lib/admin";

export default async function AdminBannerEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireAdminOnlyAccess(locale);
  const banner = await getAdminBannerById(id);

  if (!banner) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          {locale === "uk" ? "Редагування банера" : locale === "ru" ? "Редактирование баннера" : "Edit banner"}
        </h2>
      </section>
      <AdminBannerForm
        locale={locale}
        action={updateBannerAction.bind(null, banner.id)}
        initialValues={{
          key: banner.key,
          type: banner.type,
          href: banner.href ?? "",
          isActive: banner.isActive,
          sortOrder: banner.sortOrder,
          image: banner.image ?? "",
          translations: getAdminBannerLocaleFields(banner),
        }}
      />
    </div>
  );
}
