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
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:max-w-[1800px]">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)] lg:p-6 xl:p-7">
        <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,248px)_minmax(0,1fr)] xl:items-start xl:gap-8">
          <div className="space-y-3 xl:sticky xl:top-6 xl:z-10">
            <div className="rounded-[1.4rem] border border-[color:var(--color-line-strong)] bg-[var(--gradient-hero)] px-4 py-3">
              <h1 className="text-lg font-semibold leading-tight text-[color:var(--color-text)]">{title}</h1>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-text-soft)]">
                {roleLabel}
              </p>
              <p className="mt-1 text-sm text-[color:var(--color-text)]">
                {user.name ?? user.email ?? user.login ?? user.id}
              </p>
            </div>
            <AdminSidebar
              locale={locale}
              role={user.role}
              canAccessPriceUpdates={user.canAccessPriceUpdates}
            />
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      </section>
    </main>
  );
}
