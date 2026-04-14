"use client";

import { startTransition, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";

type QuickBuildRequestPrefill = {
  fullName: string;
  contact: string;
  telegramUsername: string;
  budget: string;
  useCase: string;
  preferences: string;
  needsMonitor: boolean;
  needsPeripherals: boolean;
  needsUpgrade: boolean;
  source: string;
  website: string;
  promoCode: string;
};


function translateServerError(message: string, t: (key: Parameters<ReturnType<typeof useTranslations>>[0]) => string) {
  if (message === "Некоректний бюджет" || message === "Budget is invalid") {
    return t("buildRequestErrorInvalidBudget");
  }

  if (message === "Некоректний контакт" || message === "Contact is invalid") {
    return t("buildRequestErrorInvalidContact");
  }

  if (
    message === "Забагато схожих заявок за короткий час" ||
    message === "Too many duplicate requests"
  ) {
    return t("buildRequestErrorDuplicate");
  }

  if (
    message === "Запит містить непідтримуваний вміст" ||
    message === "Request contains unsupported content" ||
    message === "Виявлено спам" ||
    message === "Spam detected"
  ) {
    return t("buildRequestErrorUnsupported");
  }

  return message || t("buildRequestErrorGeneric");
}

export function QuickBuildRequestForm({
  locale,
  initialValues,
  supportEmail,
  supportPhone,
  telegramUrl,
}: {
  locale: AppLocale;
  initialValues: QuickBuildRequestPrefill;
  supportEmail?: string | null;
  supportPhone?: string | null;
  telegramUrl?: string | null;
}) {
  const t = useTranslations();
  const [form, setForm] = useState(initialValues);
  const [pending, setPending] = useState(false);
  const [requestNumber, setRequestNumber] = useState<string | null>(null);

  const setField = <K extends keyof QuickBuildRequestPrefill>(key: K, value: QuickBuildRequestPrefill[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const directContacts = [
    telegramUrl ? { href: telegramUrl, label: t("buildRequestContactTelegram") } : null,
    supportPhone ? { href: `tel:${supportPhone.replace(/\s+/g, "")}`, label: t("buildRequestContactPhone") } : null,
    supportEmail ? { href: `mailto:${supportEmail}`, label: t("buildRequestContactEmail") } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  const submit = () => {
    setPending(true);

    startTransition(async () => {
      try {
        const response = await fetch("/api/build-requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale,
            fullName: form.fullName,
            contact: form.contact,
            budget: form.budget,
            useCase: form.useCase,
            preferences: form.preferences,
            needsMonitor: form.needsMonitor,
            needsPeripherals: form.needsPeripherals,
            needsUpgrade: form.needsUpgrade,
            source: form.source,
            website: form.website,
            telegramUsername: form.telegramUsername,
            promoCode: form.promoCode,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; request?: { number: string } }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || t("buildRequestErrorGeneric"));
        }

        setRequestNumber(payload?.request?.number ?? null);
        toast.success(t("configuratorRequestCreated"));
      } catch (error) {
        toast.error(
          error instanceof Error ? translateServerError(error.message, t) : t("buildRequestErrorGeneric"),
        );
      } finally {
        setPending(false);
      }
    });
  };

  return (
    <section className="rounded-[2.4rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-6 shadow-[var(--shadow-strong)] sm:p-8">
      <div className="max-w-3xl">
        <h1 className="font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
          {t("buildRequestTitle")}
        </h1>
        <p className="mt-4 text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">{t("buildRequestIntro")}</p>
      </div>

      {requestNumber ? (
        <div className="mt-6 rounded-[1.6rem] border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] p-5">
          <p className="text-lg font-semibold text-[color:var(--color-text)]">{t("configuratorRequestCreated")}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-soft)]">{t("buildRequestSuccessBody")}</p>
          <p className="mt-3 text-sm font-medium text-[color:var(--color-text)]">
            {t("buildRequestNumberLabel")}: {requestNumber}
          </p>

          <div className="mt-5 rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]/80 p-4">
            <p className="text-sm font-medium text-[color:var(--color-text)]">{t("buildRequestNextStepTitle")}</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-soft)]">{t("buildRequestNextStepBody")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/configurator">
                <Button variant="secondary">{t("buildRequestContinueConfigurator")}</Button>
              </Link>
              {directContacts.map((channel) => (
                <a key={channel.href} href={channel.href} className="inline-flex">
                  <Button type="button" variant="ghost">
                    {channel.label}
                  </Button>
                </a>
              ))}
            </div>
            {directContacts.length > 0 ? (
              <p className="mt-3 text-xs leading-6 text-[color:var(--color-text-soft)]">{t("buildRequestContactChannelsHint")}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{t("buildRequestFullNameLabel")}</span>
            <input
              value={form.fullName}
              onChange={(event) => setField("fullName", event.target.value)}
              placeholder={t("buildRequestPlaceholderFullName")}
              maxLength={120}
              className="h-12 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{t("buildRequestContactLabel")}</span>
            <input
              value={form.contact}
              onChange={(event) => setField("contact", event.target.value)}
              placeholder={t("buildRequestContactPlaceholder")}
              maxLength={160}
              className="h-12 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{t("checkoutTelegramLabel")}</span>
            <input
              value={form.telegramUsername}
              onChange={(event) => setField("telegramUsername", event.target.value)}
              placeholder={t("checkoutTelegramPlaceholder")}
              maxLength={64}
              autoComplete="off"
              className="h-12 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]">{t("checkoutTelegramHint")}</span>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{t("buildRequestBudgetLabel")}</span>
            <input
              value={form.budget}
              onChange={(event) => setField("budget", event.target.value)}
              placeholder={t("buildRequestPlaceholderBudget")}
              inputMode="decimal"
              maxLength={40}
              className="h-12 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{t("buildRequestUseCaseLabel")}</span>
            <textarea
              value={form.useCase}
              onChange={(event) => setField("useCase", event.target.value)}
              placeholder={t("buildRequestPlaceholderUseCase")}
              rows={4}
              maxLength={500}
              className="rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{t("buildRequestPreferencesLabel")}</span>
            <textarea
              value={form.preferences}
              onChange={(event) => setField("preferences", event.target.value)}
              placeholder={t("buildRequestPlaceholderPreferences")}
              rows={7}
              maxLength={1000}
              className="rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>

          <div className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
            <div className="grid gap-3">
              {[
                ["needsMonitor", t("buildRequestNeedsMonitor")],
                ["needsPeripherals", t("buildRequestNeedsPeripherals")],
                ["needsUpgrade", t("buildRequestNeedsUpgrade")],
              ].map(([key, label]) => (
                <label key={key} className="flex items-start gap-3 text-sm text-[color:var(--color-text)]">
                  <input
                    type="checkbox"
                    checked={Boolean(form[key as keyof QuickBuildRequestPrefill])}
                    onChange={(event) =>
                      setField(
                        key as keyof QuickBuildRequestPrefill,
                        event.target.checked as QuickBuildRequestPrefill[keyof QuickBuildRequestPrefill],
                      )
                    }
                    className="mt-1 h-4 w-4 rounded border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)]"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>Промокод</span>
            <input
              value={form.promoCode}
              onChange={(event) => setField("promoCode", event.target.value)}
              placeholder="Якщо є — введіть тут"
              maxLength={64}
              autoComplete="off"
              className="h-12 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]/80">
              Менеджер застосує знижку при формуванні пропозиції.
            </span>
          </label>

          <label className="hidden" aria-hidden="true">
            <span>{t("buildRequestHoneypotLabel")}</span>
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(event) => setField("website", event.target.value)}
            />
          </label>

          <Button onClick={submit} disabled={pending} className="h-12 text-sm font-semibold">
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            <span>{t("buildRequestSubmit")}</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
