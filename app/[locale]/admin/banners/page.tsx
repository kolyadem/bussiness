import { deleteBannerAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import { Link } from "@/lib/i18n/routing";
import { getAdminBanners, pickAdminTranslation, requireAdminOnlyAccess } from "@/lib/admin";

export default async function AdminBannersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  await requireAdminOnlyAccess(locale);
  const query = await searchParams;
  const banners = await getAdminBanners();
  const deleted = (Array.isArray(query.deleted) ? query.deleted[0] : query.deleted) === "1";
  const copy = {
    title: "Банери",
    type: "Тип",
    status: "Статус",
    order: "Порядок",
    actions: "Дії",
    add: "Додати банер",
    edit: "Редагувати",
    remove: "Видалити",
    active: "Активний",
    inactive: "Неактивний",
    deleted: "Банер видалено.",
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6 md:flex-row md:items-end md:justify-between">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          {copy.title}
        </h2>
        <Link href="/admin/banners/new">
          <Button>{copy.add}</Button>
        </Link>
      </section>

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
                <th className="px-5 py-4">{copy.type}</th>
                <th className="px-5 py-4">{copy.status}</th>
                <th className="px-5 py-4">{copy.order}</th>
                <th className="px-5 py-4 text-right">{copy.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-line)]">
              {banners.map((banner) => {
                const translation = pickAdminTranslation(banner.translations, locale);

                return (
                  <tr key={banner.id}>
                    <td className="px-5 py-4">
                      <div className="flex min-w-[320px] gap-4">
                        <div className="w-28 shrink-0">
                          {banner.image ? (
                            <ProductImageFrame
                              src={banner.image}
                              alt={translation.title}
                              className="rounded-[1.2rem] bg-white/90 shadow-none"
                              fillClassName="p-3"
                            />
                          ) : (
                            <div className="aspect-[4/3] rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)]" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-[color:var(--color-text)]">{translation.title}</p>
                          <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                            {translation.subtitle ?? ""}
                          </p>
                          <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">{banner.key}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[color:var(--color-text)]">{banner.type}</td>
                    <td className="px-5 py-4 text-sm text-[color:var(--color-text)]">
                      {banner.isActive ? copy.active : copy.inactive}
                    </td>
                    <td className="px-5 py-4 text-sm text-[color:var(--color-text)]">{banner.sortOrder}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/banners/${banner.id}/edit`}>
                          <Button variant="secondary">{copy.edit}</Button>
                        </Link>
                        <form action={deleteBannerAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="bannerId" value={banner.id} />
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
