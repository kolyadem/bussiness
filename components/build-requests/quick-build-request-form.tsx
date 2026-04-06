"use client";

import { startTransition, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";

type QuickBuildRequestPrefill = {
  fullName: string;
  contact: string;
  budget: string;
  useCase: string;
  preferences: string;
  needsMonitor: boolean;
  needsPeripherals: boolean;
  needsUpgrade: boolean;
  source: string;
  website: string;
};

function getCopy(_locale: AppLocale) {
  return {
    title: "Запит на підбір ПК",
    intro:
      "Коротко опишіть бюджет і задачі. Менеджер отримає заявку, збереже контекст і повернеться з акуратною пропозицією без обов'язкового проходження повного configurator-сценарію.",
    fullName: "Ім'я",
    contact: "Контакт для зв'язку",
    budget: "Бюджет",
    useCase: "Для чого потрібен ПК",
    preferences: "Побажання або коментар",
    needsMonitor: "Потрібен монітор",
    needsPeripherals: "Потрібна периферія",
    needsUpgrade: "Потрібен апгрейд, а не новий ПК",
    submit: "Надіслати заявку",
    successTitle: "Заявку прийнято",
    successBody:
      "Ми зберегли ваш запит і передали його менеджеру. Найближчий крок — він зв'яжеться за вказаним контактом, щоб уточнити деталі або одразу запропонувати конфігурацію.",
    requestNumber: "Номер заявки",
    sourceLabel: "Контекст запиту",
    sourceHint: "Поле можна відредагувати, якщо хочете уточнити, звідки саме прийшли.",
    nextStepTitle: "Що можна зробити далі",
    nextStepPrimary: "Почекати на зв'язок менеджера або одразу продовжити в configurator, якщо хочете точніше зібрати склад системи.",
    continueToConfigurator: "Перейти в configurator",
    contactHint: "Якщо питання термінове, можна скористатися прямим каналом зв'язку.",
    contactTelegram: "Написати в Telegram",
    contactPhone: "Зателефонувати",
    contactEmail: "Написати на email",
    placeholders: {
      fullName: "Ваше ім'я",
      contact: "Телефон, Telegram або email",
      budget: "Наприклад: 50000",
      useCase: "Ігри, робота, навчання, монтаж, стрімінг...",
      preferences: "Тиша, компактний корпус, конкретний бренд, апгрейд поточної системи...",
    },
    errors: {
      generic: "Не вдалося відправити заявку. Спробуйте ще раз.",
      invalidBudget: "Вкажіть коректний бюджет у допустимому діапазоні.",
      invalidContact: "Вкажіть коректний телефон, Telegram або email для зв'язку.",
      duplicate: "Схожа заявка вже щойно була відправлена. Спробуйте трохи пізніше.",
      unsupported: "Заявка містить некоректні або зайві дані. Уточніть текст і спробуйте ще раз.",
    },
  };
}

function translateServerError(
  message: string,
  errors: {
    generic: string;
    invalidBudget: string;
    invalidContact: string;
    duplicate: string;
    unsupported: string;
  },
) {
  if (message === "Некоректний бюджет" || message === "Budget is invalid") {
    return errors.invalidBudget;
  }

  if (message === "Некоректний контакт" || message === "Contact is invalid") {
    return errors.invalidContact;
  }

  if (
    message === "Забагато схожих заявок за короткий час" ||
    message === "Too many duplicate requests"
  ) {
    return errors.duplicate;
  }

  if (
    message === "Запит містить непідтримуваний вміст" ||
    message === "Request contains unsupported content" ||
    message === "Виявлено спам" ||
    message === "Spam detected"
  ) {
    return errors.unsupported;
  }

  return message || errors.generic;
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
  const copy = getCopy(locale);
  const [form, setForm] = useState(initialValues);
  const [pending, setPending] = useState(false);
  const [requestNumber, setRequestNumber] = useState<string | null>(null);

  const setField = <K extends keyof QuickBuildRequestPrefill>(key: K, value: QuickBuildRequestPrefill[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const directContacts = [
    telegramUrl ? { href: telegramUrl, label: copy.contactTelegram } : null,
    supportPhone ? { href: `tel:${supportPhone.replace(/\s+/g, "")}`, label: copy.contactPhone } : null,
    supportEmail ? { href: `mailto:${supportEmail}`, label: copy.contactEmail } : null,
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
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; request?: { number: string } }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || copy.errors.generic);
        }

        setRequestNumber(payload?.request?.number ?? null);
        toast.success(copy.successTitle);
      } catch (error) {
        toast.error(
          error instanceof Error ? translateServerError(error.message, copy.errors) : copy.errors.generic,
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
          {copy.title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">{copy.intro}</p>
      </div>

      {requestNumber ? (
        <div className="mt-6 rounded-[1.6rem] border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] p-5">
          <p className="text-lg font-semibold text-[color:var(--color-text)]">{copy.successTitle}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-soft)]">{copy.successBody}</p>
          <p className="mt-3 text-sm font-medium text-[color:var(--color-text)]">
            {copy.requestNumber}: {requestNumber}
          </p>

          <div className="mt-5 rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)]/80 p-4">
            <p className="text-sm font-medium text-[color:var(--color-text)]">{copy.nextStepTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-soft)]">{copy.nextStepPrimary}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/configurator">
                <Button variant="secondary">{copy.continueToConfigurator}</Button>
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
              <p className="mt-3 text-xs leading-6 text-[color:var(--color-text-soft)]">{copy.contactHint}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.fullName}</span>
            <input
              value={form.fullName}
              onChange={(event) => setField("fullName", event.target.value)}
              placeholder={copy.placeholders.fullName}
              maxLength={120}
              className="h-12 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.contact}</span>
            <input
              value={form.contact}
              onChange={(event) => setField("contact", event.target.value)}
              placeholder={copy.placeholders.contact}
              maxLength={160}
              className="h-12 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.budget}</span>
            <input
              value={form.budget}
              onChange={(event) => setField("budget", event.target.value)}
              placeholder={copy.placeholders.budget}
              inputMode="decimal"
              maxLength={40}
              className="h-12 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.useCase}</span>
            <textarea
              value={form.useCase}
              onChange={(event) => setField("useCase", event.target.value)}
              placeholder={copy.placeholders.useCase}
              rows={4}
              maxLength={500}
              className="rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.preferences}</span>
            <textarea
              value={form.preferences}
              onChange={(event) => setField("preferences", event.target.value)}
              placeholder={copy.placeholders.preferences}
              rows={7}
              maxLength={1000}
              className="rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>

          <div className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
            <div className="grid gap-3">
              {[
                ["needsMonitor", copy.needsMonitor],
                ["needsPeripherals", copy.needsPeripherals],
                ["needsUpgrade", copy.needsUpgrade],
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
            <span>{copy.sourceLabel}</span>
            <input
              value={form.source}
              onChange={(event) => setField("source", event.target.value)}
              maxLength={180}
              className="h-12 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]/80">{copy.sourceHint}</span>
          </label>

          <label className="hidden" aria-hidden="true">
            <span>Website</span>
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(event) => setField("website", event.target.value)}
            />
          </label>

          <Button onClick={submit} disabled={pending} className="h-12 text-sm font-semibold">
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            <span>{copy.submit}</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
