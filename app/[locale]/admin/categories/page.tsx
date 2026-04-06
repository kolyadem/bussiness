import { deleteCategoryAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/routing";
import { getAdminCategories, pickAdminTranslation } from "@/lib/admin";

export default async function AdminCategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const categories = await getAdminCategories();
  const notice = Array.isArray(query.error) ? query.error[0] : query.error;
  const deleted = (Array.isArray(query.deleted) ? query.deleted[0] : query.deleted) === "1";
  const copy = {
    title: "Категорії",
    parent: "Батьківська",
    products: "Товари",
    children: "Підкатегорії",
    add: "Додати категорію",
    actions: "Дії",
    edit: "Редагувати",
    remove: "Видалити",
    inUse: "Категорію не можна видалити, поки вона має товари або підкатегорії.",
    deleted: "Категорію видалено.",
    empty: "—",
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6 md:flex-row md:items-end md:justify-between">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          {copy.title}
        </h2>
        <Link href="/admin/categories/new">
          <Button>{copy.add}</Button>
        </Link>
      </section>

      {notice === "category-in-use" ? (
        <p className="rounded-[1.2rem] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {copy.inUse}
        </p>
      ) : null}

      {deleted ? (
        <p className="rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {copy.deleted}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[color:var(--color-line)]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                <th className="px-5 py-4">{copy.title}</th>
                <th className="px-5 py-4">{copy.parent}</th>
                <th className="px-5 py-4">{copy.products}</th>
                <th className="px-5 py-4">{copy.children}</th>
                <th className="px-5 py-4 text-right">{copy.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-line)]">
              {categories.map((category) => {
                const translation = pickAdminTranslation(category.translations, locale);
                const parentName = category.parent
                  ? pickAdminTranslation(category.parent.translations, locale).name
                  : copy.empty;

                return (
                  <tr key={category.id}>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-[color:var(--color-text)]">{translation.name}</p>
                        <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                          {translation.description ?? ""}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[color:var(--color-text-soft)]">{parentName}</td>
                    <td className="px-5 py-4 text-sm text-[color:var(--color-text)]">{category._count.products}</td>
                    <td className="px-5 py-4 text-sm text-[color:var(--color-text)]">{category._count.children}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/categories/${category.id}/edit`}>
                          <Button variant="secondary">{copy.edit}</Button>
                        </Link>
                        <form action={deleteCategoryAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="categoryId" value={category.id} />
                          <Button type="submit" variant="ghost">
                            {copy.remove}
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
