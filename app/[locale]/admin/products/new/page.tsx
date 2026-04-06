import { AdminProductForm } from "@/components/admin/admin-product-form";
import { canViewAdminFinancials, getAdminProductOptions, requireAdminAccess } from "@/lib/admin";

export default async function NewAdminProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const viewer = await requireAdminAccess(locale);
  const options = await getAdminProductOptions();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          Новий товар
        </h2>
      </section>
      <AdminProductForm
        locale={locale}
        canViewFinancials={canViewAdminFinancials(viewer.role)}
        {...options}
      />
    </div>
  );
}
