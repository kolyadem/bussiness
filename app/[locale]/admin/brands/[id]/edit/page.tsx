import { notFound } from "next/navigation";
import { updateBrandAction } from "@/app/actions/admin";
import { AdminBrandForm } from "@/components/admin/admin-brand-form";
import { getAdminBrandById, getAdminBrandLocaleFields } from "@/lib/admin";

export default async function AdminBrandEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const brand = await getAdminBrandById(id);

  if (!brand) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          {locale === "uk" ? "Редагування бренду" : locale === "ru" ? "Редактирование бренда" : "Edit brand"}
        </h2>
      </section>
      <AdminBrandForm
        locale={locale}
        action={updateBrandAction.bind(null, brand.id)}
        initialValues={{
          slug: brand.slug,
          logo: brand.logo ?? "",
          website: brand.website ?? "",
          sortOrder: brand.sortOrder,
          translations: getAdminBrandLocaleFields(brand),
        }}
      />
    </div>
  );
}
