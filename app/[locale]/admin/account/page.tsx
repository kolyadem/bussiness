import { updateAdminAccountAction } from "@/app/actions/admin";
import { AdminAccountForm } from "@/components/admin/admin-account-form";
import { getAdminAccountData, requireAdminAccess } from "@/lib/admin";

export default async function AdminAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAdminAccess(locale);
  const account = await getAdminAccountData(user.id);

  if (!account) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--color-text-soft)]">Account</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          {locale === "uk" ? "Налаштування адміністратора" : locale === "ru" ? "Настройки администратора" : "Administrator settings"}
        </h2>
      </section>
      <AdminAccountForm
        locale={locale}
        action={updateAdminAccountAction}
        initialValues={{
          login: account.login,
          role: account.role,
          name: account.name,
          email: account.email,
          phone: account.phone,
        }}
      />
    </div>
  );
}
