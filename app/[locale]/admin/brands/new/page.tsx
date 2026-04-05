import { createBrandAction } from "@/app/actions/admin";
import { AdminBrandForm } from "@/components/admin/admin-brand-form";

export default async function AdminBrandNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          {locale === "uk" ? "Новий бренд" : locale === "ru" ? "Новый бренд" : "New brand"}
        </h2>
      </section>
      <AdminBrandForm locale={locale} action={createBrandAction} />
    </div>
  );
}
