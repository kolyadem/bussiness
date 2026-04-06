import { notFound } from "next/navigation";
import { updateCategoryAction } from "@/app/actions/admin";
import { AdminCategoryForm } from "@/components/admin/admin-category-form";
import { getAdminCategoryById, getAdminCategoryLocaleFields, getAdminProductOptions } from "@/lib/admin";

export default async function AdminCategoryEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const [category, { categories }] = await Promise.all([
    getAdminCategoryById(id),
    getAdminProductOptions(),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          Редагування категорії
        </h2>
      </section>
      <AdminCategoryForm
        locale={locale}
        action={updateCategoryAction.bind(null, category.id)}
        categories={categories}
        currentCategoryId={category.id}
        initialValues={{
          slug: category.slug,
          parentId: category.parentId,
          image: category.image ?? "",
          sortOrder: category.sortOrder,
          translations: getAdminCategoryLocaleFields(category),
        }}
      />
    </div>
  );
}
