"use client";

import { useActionState } from "react";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";

type AccountActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

type AccountAction = (
  state: AccountActionState,
  formData: FormData,
) => Promise<AccountActionState>;

export function AdminAccountForm({
  locale,
  action,
  initialValues,
}: {
  locale: string;
  action: AccountAction;
  initialValues: {
    login: string;
    role: string;
    name: string;
    email: string;
    phone: string | null;
  };
}) {
  const [state, formAction] = useActionState(action, {
    status: "idle",
  });
  const copy = {
    profile: locale === "uk" ? "Профіль" : locale === "ru" ? "Профиль" : "Profile",
    password: locale === "uk" ? "Зміна пароля" : locale === "ru" ? "Смена пароля" : "Password change",
    login: locale === "uk" ? "Логін" : locale === "ru" ? "Логин" : "Login",
    role: locale === "uk" ? "Роль" : locale === "ru" ? "Роль" : "Role",
    name: locale === "uk" ? "Ім'я" : locale === "ru" ? "Имя" : "Name",
    email: "Email",
    phone: locale === "uk" ? "Телефон" : locale === "ru" ? "Телефон" : "Phone",
    currentPassword:
      locale === "uk" ? "Поточний пароль" : locale === "ru" ? "Текущий пароль" : "Current password",
    nextPassword:
      locale === "uk" ? "Новий пароль" : locale === "ru" ? "Новый пароль" : "New password",
    confirmPassword:
      locale === "uk"
        ? "Підтвердження пароля"
        : locale === "ru"
          ? "Подтверждение пароля"
          : "Confirm password",
    save: locale === "uk" ? "Зберегти зміни" : locale === "ru" ? "Сохранить изменения" : "Save changes",
    saving: locale === "uk" ? "Збереження..." : locale === "ru" ? "Сохранение..." : "Saving...",
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.profile}</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.login}</span>
            <input value={initialValues.login} disabled className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text-soft)] outline-none" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.role}</span>
            <input value={initialValues.role} disabled className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text-soft)] outline-none" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.name}</span>
            <input name="name" defaultValue={initialValues.name} required className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.email}</span>
            <input name="email" type="email" defaultValue={initialValues.email} required className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2">
            <span>{copy.phone}</span>
            <input value={initialValues.phone ?? ""} disabled className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text-soft)] outline-none" />
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.password}</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.currentPassword}</span>
            <input name="currentPassword" type="password" className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.nextPassword}</span>
            <input name="nextPassword" type="password" className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.confirmPassword}</span>
            <input name="confirmPassword" type="password" className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" />
          </label>
        </div>
      </section>

      {state.message ? (
        <p className={state.status === "success" ? "rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-300" : "rounded-[1.2rem] border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300"}>
          {state.message}
        </p>
      ) : null}

      <AdminSubmitButton pendingLabel={copy.saving}>{copy.save}</AdminSubmitButton>
    </form>
  );
}
