import { updateUserRoleAction } from "@/app/actions/admin-users";
import { getAdminUsers, requireAdminOnlyAccess } from "@/lib/admin";
import { USER_ROLES } from "@/lib/auth";

type SearchParams = {
  saved?: string;
  error?: string;
};

function getCopy(locale: "uk" | "ru" | "en") {
  return {
    title: locale === "uk" ? "Користувачі та ролі" : locale === "ru" ? "Пользователи и роли" : "Users and roles",
    subtitle:
      locale === "uk"
        ? "Тільки власник магазину може видавати або знімати роль менеджера."
        : locale === "ru"
          ? "Только владелец магазина может выдавать или снимать роль менеджера."
          : "Only the store owner can grant or revoke manager access.",
    login: locale === "uk" ? "Логін" : locale === "ru" ? "Логин" : "Login",
    name: locale === "uk" ? "Користувач" : locale === "ru" ? "Пользователь" : "User",
    contacts: locale === "uk" ? "Контакти" : locale === "ru" ? "Контакты" : "Contacts",
    orders: locale === "uk" ? "Замовлень" : locale === "ru" ? "Заказов" : "Orders",
    role: locale === "uk" ? "Роль" : locale === "ru" ? "Роль" : "Role",
    save: locale === "uk" ? "Зберегти" : locale === "ru" ? "Сохранить" : "Save",
    locked: locale === "uk" ? "Захищено" : locale === "ru" ? "Защищено" : "Locked",
    customer: locale === "uk" ? "Клієнт" : locale === "ru" ? "Клиент" : "Customer",
    manager: locale === "uk" ? "Менеджер" : locale === "ru" ? "Менеджер" : "Manager",
    admin: locale === "uk" ? "Адміністратор" : locale === "ru" ? "Администратор" : "Administrator",
    saved:
      locale === "uk"
        ? "Роль користувача оновлено."
        : locale === "ru"
          ? "Роль пользователя обновлена."
          : "User role updated.",
    missingUser:
      locale === "uk"
        ? "Не вдалося визначити користувача."
        : locale === "ru"
          ? "Не удалось определить пользователя."
          : "Could not resolve the user.",
    userNotFound:
      locale === "uk" ? "Користувача не знайдено." : locale === "ru" ? "Пользователь не найден." : "User not found.",
    selfLock:
      locale === "uk"
        ? "Не можна змінювати власну роль."
        : locale === "ru"
          ? "Нельзя менять собственную роль."
          : "You cannot change your own role.",
    adminLock:
      locale === "uk"
        ? "ADMIN-акаунти захищені від редагування з цього екрану."
        : locale === "ru"
          ? "ADMIN-аккаунты защищены от редактирования с этого экрана."
          : "ADMIN accounts are locked on this screen.",
    lastAdminLock:
      locale === "uk"
        ? "Не можна змінити роль останнього ADMIN."
        : locale === "ru"
          ? "Нельзя изменить роль последнего ADMIN."
          : "The last ADMIN account cannot be changed.",
  };
}

function getRoleLabel(role: string, copy: ReturnType<typeof getCopy>) {
  if (role === USER_ROLES.admin) {
    return copy.admin;
  }

  if (role === USER_ROLES.manager) {
    return copy.manager;
  }

  return copy.customer;
}

function getFeedback(searchParams: SearchParams, copy: ReturnType<typeof getCopy>) {
  if (searchParams.saved) {
    return {
      tone: "success" as const,
      message: copy.saved,
    };
  }

  switch (searchParams.error) {
    case "missing-user":
      return { tone: "error" as const, message: copy.missingUser };
    case "user-not-found":
      return { tone: "error" as const, message: copy.userNotFound };
    case "self-role-lock":
      return { tone: "error" as const, message: copy.selfLock };
    case "last-admin-lock":
      return { tone: "error" as const, message: copy.lastAdminLock };
    default:
      return null;
  }
}

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: "uk" | "ru" | "en" }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const admin = await requireAdminOnlyAccess(locale);
  const users = await getAdminUsers();
  const copy = getCopy(locale);
  const feedback = getFeedback(query, copy);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">{copy.subtitle}</p>
      </section>

      {feedback ? (
        <p
          className={
            feedback.tone === "success"
              ? "rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
              : "rounded-[1.2rem] border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300"
          }
        >
          {feedback.message}
        </p>
      ) : null}

      <section className="grid gap-4">
        {users.map((user) => {
          const isSelf = user.id === admin.id;
          const isLockedAdmin = user.role === USER_ROLES.admin;
          const isEditable = !isSelf && !isLockedAdmin;

          return (
            <article
              key={user.id}
              className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                      {getRoleLabel(user.role, copy)}
                    </span>
                    {isSelf ? (
                      <span className="rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-text)]">
                        {copy.locked}
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
                      {user.name || user.email || user.login}
                    </h3>
                    <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                      {copy.login}: {user.login}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-[color:var(--color-text-soft)] sm:grid-cols-2">
                    <p>
                      {copy.contacts}:{" "}
                      <span className="text-[color:var(--color-text)]">
                        {[user.email, user.phone].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </p>
                    <p>
                      {copy.orders}:{" "}
                      <span className="text-[color:var(--color-text)]">{user._count.orders}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4">
                  {isEditable ? (
                    <form action={updateUserRoleAction} className="grid gap-3">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="userId" value={user.id} />
                      <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
                        <span>{copy.role}</span>
                        <select
                          name="role"
                          defaultValue={user.role === USER_ROLES.manager ? USER_ROLES.manager : USER_ROLES.customer}
                          className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none"
                        >
                          <option value={USER_ROLES.customer}>{copy.customer}</option>
                          <option value={USER_ROLES.manager}>{copy.manager}</option>
                        </select>
                      </label>
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-5 text-sm font-medium text-[color:var(--color-text)] transition hover:border-[color:var(--color-accent-line)] hover:text-[color:var(--color-accent-strong)]"
                      >
                        {copy.save}
                      </button>
                    </form>
                  ) : (
                    <div className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
                      <p>{copy.role}</p>
                      <p className="text-base font-medium text-[color:var(--color-text)]">{getRoleLabel(user.role, copy)}</p>
                      <p>
                        {isSelf ? copy.selfLock : isLockedAdmin ? copy.adminLock : copy.lastAdminLock}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
