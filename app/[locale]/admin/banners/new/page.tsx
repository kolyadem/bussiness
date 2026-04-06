import { createBannerAction } from "@/app/actions/admin";
import { AdminBannerForm } from "@/components/admin/admin-banner-form";
import { requireAdminOnlyAccess } from "@/lib/admin";

export default async function AdminBannerNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminOnlyAccess(locale);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          Новий банер
        </h2>
      </section>
      <AdminBannerForm locale={locale} action={createBannerAction} />
    </div>
  );
}
