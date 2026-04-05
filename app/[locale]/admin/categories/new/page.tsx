import { createCategoryAction } from "@/app/actions/admin";
import { AdminCategoryForm } from "@/components/admin/admin-category-form";
import { getAdminProductOptions } from "@/lib/admin";

export default async function AdminCategoryNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { categories } = await getAdminProductOptions();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          {locale === "uk" ? "Нова категорія" : locale === "ru" ? "Новая категория" : "New category"}
        </h2>
      </section>
      <AdminCategoryForm locale={locale} action={createCategoryAction} categories={categories} />
    </div>
  );
}
