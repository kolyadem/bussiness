"use client";

import Image from "next/image";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { getSession, signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { registerAccount } from "@/app/actions/auth";
import { initialRegisterFormState } from "@/components/auth/register-form-state";

const MANAGER_ROLES = new Set(["ADMIN", "MANAGER"]);

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  error?: string;
  value: string;
  invalid?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  maxLength?: number;
  pattern?: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

function Field({
  label,
  name,
  type = "text",
  error,
  value,
  invalid = false,
  inputMode,
  autoComplete,
  maxLength,
  pattern,
  placeholder,
  onChange,
}: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        pattern={pattern}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`h-12 rounded-[1.15rem] border bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-text)] outline-none transition ${invalid ? "border-rose-500 focus:border-rose-500" : "border-[color:var(--color-line)] focus:border-[color:var(--color-line-strong)]"}`}
        required
      />
      {error ? <span className="text-sm text-rose-500">{error}</span> : null}
    </label>
  );
}

function PhoneField({
  label,
  error,
  value,
  onChange,
}: {
  label: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const invalid = Boolean(error);

  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
        {label}
      </span>
      <div
        className={`flex h-12 items-center rounded-[1.15rem] border bg-[color:var(--color-surface)] ${invalid ? "border-rose-500" : "border-[color:var(--color-line)]"}`}
      >
        <div className="flex h-full items-center gap-2 border-r border-[color:var(--color-line)] px-4 text-sm text-[color:var(--color-text)]">
          <Image
            src="/flags/ua.svg"
            alt=""
            aria-hidden="true"
            width={20}
            height={14}
            className="h-[14px] w-5 rounded-sm object-cover"
          />
          <span>+380</span>
        </div>
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={value}
          maxLength={9}
          pattern="[0-9]{9}"
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 9))}
          className="h-full w-full bg-transparent px-4 text-sm text-[color:var(--color-text)] outline-none"
          placeholder="XX XXX XX XX"
          required
        />
      </div>
      {error ? <span className="text-sm text-rose-500">{error}</span> : null}
    </label>
  );
}

const primaryButtonBase =
  "mt-2 inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-sm font-medium transition disabled:cursor-not-allowed";

const primaryButtonActive =
  "bg-[color:var(--color-text)] text-[color:var(--color-surface)] hover:opacity-92";

const primaryButtonDisabled =
  "bg-[color:var(--color-surface)] text-[color:var(--color-text-soft)] opacity-70";

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function mergeStorefrontState() {
  const response = await fetch("/api/auth/storefront-merge", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Не вдалося об'єднати стан вітрини");
  }
}

export function AccountAuthPanel() {
  const t = useTranslations();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginForm, setLoginForm] = useState({
    login: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    login: "",
    phone: "",
    email: "",
    fullName: "",
    password: "",
    confirmPassword: "",
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginPending, startLoginTransition] = useTransition();
  const [autoSignInError, setAutoSignInError] = useState<string | null>(null);
  const [registerState, registerAction, isRegisterPending] = useActionState(
    registerAccount,
    initialRegisterFormState,
  );
  const registerStatus = registerState.status;
  const registerLogin = registerState.login ?? "";
  const registerValueLogin = registerState.values?.login ?? "";
  const registerValuePhone = registerState.values?.phone ?? "";
  const registerValueEmail = registerState.values?.email ?? "";
  const registerValueFullName = registerState.values?.fullName ?? "";

  const applyRegisterState = useCallback(() => {
    if (registerStatus === "success") {
      return;
    }

    if (registerStatus === "error") {
      setRegisterForm((current) => ({
        login: registerValueLogin || current.login,
        phone: registerValuePhone || current.phone,
        email: registerValueEmail || current.email,
        fullName: registerValueFullName || current.fullName,
        password: "",
        confirmPassword: "",
      }));
      setAutoSignInError(null);
    }
  }, [
    registerStatus,
    registerValueLogin,
    registerValuePhone,
    registerValueEmail,
    registerValueFullName,
  ]);

  useEffect(() => {
    queueMicrotask(applyRegisterState);
  }, [applyRegisterState]);

  const resolvedTab = registerState.status === "success" ? "login" : activeTab;
  const passwordsMismatch =
    registerState.message === "authPasswordsMismatch" ||
    registerState.fieldErrors?.password?.includes("authPasswordsMismatch") ||
    registerState.fieldErrors?.confirmPassword?.includes("authPasswordsMismatch") ||
    (registerForm.password.length > 0 &&
      registerForm.confirmPassword.length > 0 &&
      registerForm.password !== registerForm.confirmPassword);
  const clientPasswordTooShort =
    registerForm.password.length > 0 && registerForm.password.length < 8;
  const registerMessage =
    registerState.message && registerState.message !== "authPasswordsMismatch"
      ? t(registerState.message)
      : null;
  const postRegisterError = autoSignInError ? t(autoSignInError) : null;

  const loginIsValid =
    loginForm.login.trim().length > 0 && loginForm.password.trim().length > 0;
  const registerIsValid =
    registerForm.login.trim().length >= 3 &&
    registerForm.phone.length === 9 &&
    isEmailValid(registerForm.email.trim()) &&
    registerForm.fullName.trim().length >= 2 &&
    registerForm.password.length >= 8 &&
    registerForm.confirmPassword.length >= 8 &&
    registerForm.password === registerForm.confirmPassword;
  const tooManyLoginAttemptsMessage = "Забагато спроб входу. Спробуйте трохи пізніше.";

  const resolvedLocale = locale;
  const redirectAfterLogin = useCallback(
    (role?: string | null) => {
      const destination = MANAGER_ROLES.has(role ?? "")
        ? `/${resolvedLocale}/admin`
        : `/${resolvedLocale}/account`;

      window.location.assign(destination);
    },
    [resolvedLocale],
  );

  const handleLoginSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const login = loginForm.login.trim().toLowerCase();
    const password = loginForm.password;

    if (!login || !password) {
      return;
    }

    setLoginError(null);

    startLoginTransition(async () => {
      try {
        const result = await signIn("credentials", {
          login,
          password,
          redirect: false,
        });

        if (result?.status === 429) {
          setLoginError(tooManyLoginAttemptsMessage);
          return;
        }

        if (!result || result.error) {
          setLoginError(t("authInvalidCredentials"));
          return;
        }

        const session = await getSession();
        await mergeStorefrontState();

        setLoginForm((current) => ({ ...current, password: "" }));
        redirectAfterLogin(session?.user?.role);
      } catch {
        setLoginError(t("authSignInFailed"));
      }
    });
  };

  const translateError = (value?: string) => (value ? t(value) : undefined);
  const passwordError =
    translateError(registerState.fieldErrors?.password?.[0]) ||
    (clientPasswordTooShort ? t("authPasswordMin") : undefined);
  const confirmPasswordError =
    translateError(registerState.fieldErrors?.confirmPassword?.[0]) ||
    (passwordsMismatch ? t("authPasswordsMismatch") : undefined);

  useEffect(() => {
    if (registerStatus !== "success" || !registerLogin || registerForm.password.length < 8) {
      return;
    }

    const password = registerForm.password;

    startLoginTransition(async () => {
      try {
        const result = await signIn("credentials", {
          login: registerLogin,
          password,
          redirect: false,
        });

        if (!result || result.error) {
          setAutoSignInError("authPostRegisterSignInFailed");
          setLoginForm({
            login: registerLogin,
            password,
          });
          setActiveTab("login");
          return;
        }

        setAutoSignInError(null);
        setLoginError(null);
        setLoginForm({
          login: "",
          password: "",
        });
        setRegisterForm({
          login: "",
          phone: "",
          email: "",
          fullName: "",
          password: "",
          confirmPassword: "",
        });
        const session = await getSession();
        await mergeStorefrontState();
        redirectAfterLogin(session?.user?.role);
      } catch {
        setAutoSignInError("authPostRegisterSignInFailed");
        setLoginForm({
          login: registerLogin,
          password,
        });
        setActiveTab("login");
      }
    });
  }, [
    locale,
    redirectAfterLogin,
    registerForm.password,
    registerLogin,
    registerStatus,
    startLoginTransition,
  ]);

  return (
    <div className="mx-auto w-full max-w-[32rem] rounded-[2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="inline-flex w-full rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-1">
        <button
          type="button"
          onClick={() => setActiveTab("login")}
          className={`flex-1 rounded-full px-4 py-2 text-sm transition ${resolvedTab === "login" ? "bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] shadow-[0_0_0_1px_var(--color-line)]" : "text-[color:var(--color-text-soft)]"}`}
        >
          {t("authTabsLogin")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("register")}
          className={`flex-1 rounded-full px-4 py-2 text-sm transition ${resolvedTab === "register" ? "bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] shadow-[0_0_0_1px_var(--color-line)]" : "text-[color:var(--color-text-soft)]"}`}
        >
          {t("authTabsRegister")}
        </button>
      </div>

      {resolvedTab === "login" ? (
        <form onSubmit={handleLoginSubmit} className="mt-6 grid gap-4">
          <Field
            label={t("authLogin")}
            name="login"
            value={loginForm.login}
            onChange={(value) => setLoginForm((current) => ({ ...current, login: value }))}
            autoComplete="username"
            placeholder="Логін або email"
          />
          <Field
            label={t("authPassword")}
            name="password"
            type="password"
            value={loginForm.password}
            onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))}
            autoComplete="current-password"
          />
          {registerState.status === "success" && postRegisterError ? (
            <p className="text-sm text-emerald-500">{t("authRegisterSuccess")}</p>
          ) : null}
          {loginError ? <p className="text-sm text-rose-500">{loginError}</p> : null}
          {postRegisterError ? <p className="text-sm text-rose-500">{postRegisterError}</p> : null}
          <button
            type="submit"
            disabled={!loginIsValid || isLoginPending}
            className={`${primaryButtonBase} ${loginIsValid && !isLoginPending ? primaryButtonActive : primaryButtonDisabled}`}
          >
            {t("authSignIn")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className="text-sm text-[color:var(--color-text-soft)] transition hover:text-[color:var(--color-text)]"
          >
            {t("authNoAccount")}
          </button>
        </form>
      ) : (
        <form action={registerAction} className="mt-6 grid gap-4">
          <Field
            label={t("authLogin")}
            name="login"
            value={registerForm.login}
            onChange={(value) => setRegisterForm((current) => ({ ...current, login: value }))}
            error={translateError(registerState.fieldErrors?.login?.[0])}
            autoComplete="username"
          />
          <PhoneField
            label={t("authPhone")}
            value={registerForm.phone}
            onChange={(value) => setRegisterForm((current) => ({ ...current, phone: value }))}
            error={translateError(registerState.fieldErrors?.phone?.[0])}
          />
          <Field
            label={t("authEmail")}
            name="email"
            type="email"
            value={registerForm.email}
            onChange={(value) => setRegisterForm((current) => ({ ...current, email: value }))}
            error={translateError(registerState.fieldErrors?.email?.[0])}
            autoComplete="email"
          />
          <Field
            label={t("authFullName")}
            name="fullName"
            value={registerForm.fullName}
            onChange={(value) => setRegisterForm((current) => ({ ...current, fullName: value }))}
            error={translateError(registerState.fieldErrors?.fullName?.[0])}
            autoComplete="name"
          />
          <Field
            label={t("authPassword")}
            name="password"
            type="password"
            value={registerForm.password}
            onChange={(value) => setRegisterForm((current) => ({ ...current, password: value }))}
            invalid={passwordsMismatch || clientPasswordTooShort}
            error={passwordError}
            autoComplete="new-password"
          />
          <Field
            label={t("authConfirmPassword")}
            name="confirmPassword"
            type="password"
            value={registerForm.confirmPassword}
            onChange={(value) =>
              setRegisterForm((current) => ({ ...current, confirmPassword: value }))
            }
            invalid={passwordsMismatch}
            error={confirmPasswordError}
            autoComplete="new-password"
          />
          {registerMessage ? <p className="text-sm text-rose-500">{registerMessage}</p> : null}
          {registerState.status === "success" && !postRegisterError ? (
            <p className="text-sm text-[color:var(--color-text-soft)]">{t("authSigningIn")}</p>
          ) : null}
          <button
            type="submit"
            disabled={!registerIsValid || isRegisterPending}
            className={`${primaryButtonBase} ${registerIsValid && !isRegisterPending ? primaryButtonActive : primaryButtonDisabled}`}
          >
            {t("authCreateAccount")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className="text-sm text-[color:var(--color-text-soft)] transition hover:text-[color:var(--color-text)]"
          >
            {t("authHasAccount")}
          </button>
        </form>
      )}
    </div>
  );
}
