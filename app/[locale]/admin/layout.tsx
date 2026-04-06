import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdminAccess } from "@/lib/admin";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAdminAccess(locale);
  const title = "Керування магазином";
  const roleLabel =
    user.role === "ADMIN" ? "Власник" : "Менеджер";

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <section className="rounded-[2.4rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] lg:p-8">
        <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[var(--gradient-hero)] p-5">
              <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">{title}</h1>
              <p className="mt-3 text-sm font-medium text-[color:var(--color-text)]">{roleLabel}</p>
              <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                {user.name ?? user.email ?? user.login ?? user.id}
              </p>
            </div>
            <AdminSidebar
              locale={locale}
              role={user.role}
              canAccessPriceUpdates={user.canAccessPriceUpdates}
            />
          </div>
          <div>{children}</div>
        </div>
      </section>
    </main>
  );
}
