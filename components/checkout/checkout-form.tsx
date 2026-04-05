"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/constants";
import {
  ORDER_CITY_OPTIONS,
  type OrderDeliveryMethod,
} from "@/lib/storefront/orders";

type CheckoutPrefill = {
  fullName: string;
  phone: string;
  email: string;
  comment: string;
  deliveryCity: string;
  deliveryMethod: OrderDeliveryMethod;
  deliveryAddress: string;
  deliveryBranch: string;
};

function normalizeCityValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("uk-UA");
}

export function CheckoutForm({
  locale,
  prefill,
}: {
  locale: AppLocale;
  prefill: CheckoutPrefill;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [form, setForm] = useState(prefill);
  const hasAutofill = Boolean(prefill.fullName || prefill.phone || prefill.email);
  const isCourier = form.deliveryMethod === "NOVA_POSHTA_COURIER";

  const labels = {
    autofill:
      locale === "uk"
        ? "Дані з акаунта вже підставлені. За потреби їх можна змінити перед підтвердженням замовлення."
        : locale === "ru"
          ? "Данные аккаунта уже подставлены. При необходимости их можно изменить перед оформлением заказа."
          : "Your account details were prefilled and can still be edited before placing the order.",
    fullName: locale === "uk" ? "ПІБ" : locale === "ru" ? "ФИО" : "Full name",
    phone: locale === "uk" ? "Телефон" : locale === "ru" ? "Телефон" : "Phone",
    email: "Email",
    city: locale === "uk" ? "Місто" : locale === "ru" ? "Город" : "City",
    cityHint:
      locale === "uk"
        ? "Почніть вводити місто України"
        : locale === "ru"
          ? "Начните вводить город Украины"
          : "Start typing a city in Ukraine",
    delivery: locale === "uk" ? "Спосіб доставки" : locale === "ru" ? "Способ доставки" : "Delivery method",
    comment: locale === "uk" ? "Коментар до замовлення" : locale === "ru" ? "Комментарий к заказу" : "Order comment",
    commentHint:
      locale === "uk"
        ? "Наприклад, зручний час дзвінка або уточнення по доставці"
        : locale === "ru"
          ? "Например, удобное время звонка или уточнение по доставке"
          : "For example, the best time to call or any delivery note",
    submit:
      locale === "uk"
        ? "Підтвердити замовлення"
        : locale === "ru"
          ? "Подтвердить заказ"
          : "Place order",
    branch:
      locale === "uk"
        ? "Нова пошта — відділення"
        : locale === "ru"
          ? "Новая почта — отделение"
          : "Nova Poshta branch",
    courier:
      locale === "uk"
        ? "Нова пошта — кур'єр"
        : locale === "ru"
          ? "Новая почта — курьер"
          : "Nova Poshta courier",
    branchField:
      locale === "uk"
        ? "Номер відділення"
        : locale === "ru"
          ? "Номер отделения"
          : "Branch number",
    branchPlaceholder:
      locale === "uk"
        ? "Наприклад, 17"
        : locale === "ru"
          ? "Например, 17"
          : "For example, 17",
    addressField:
      locale === "uk"
        ? "Адреса доставки"
        : locale === "ru"
          ? "Адрес доставки"
          : "Delivery address",
    addressPlaceholder:
      locale === "uk"
        ? "Вулиця, будинок, квартира"
        : locale === "ru"
          ? "Улица, дом, квартира"
          : "Street, building, apartment",
    submitHint:
      locale === "uk"
        ? "Після оформлення менеджер зв'яжеться з вами для підтвердження деталей."
        : locale === "ru"
          ? "После оформления менеджер свяжется с вами для подтверждения деталей."
          : "Our manager will contact you after the order is placed to confirm the details.",
    fullNameError:
      locale === "uk"
        ? "Вкажіть ім'я та прізвище."
        : locale === "ru"
          ? "Укажите имя и фамилию."
          : "Enter your full name.",
    phoneError:
      locale === "uk"
        ? "Вкажіть коректний номер телефону."
        : locale === "ru"
          ? "Укажите корректный номер телефона."
          : "Enter a valid phone number.",
    emailError:
      locale === "uk"
        ? "Вкажіть коректний email."
        : locale === "ru"
          ? "Укажите корректный email."
          : "Enter a valid email address.",
    cityError:
      locale === "uk"
        ? "Оберіть або введіть місто доставки."
        : locale === "ru"
          ? "Выберите или введите город доставки."
          : "Choose or enter a delivery city.",
    branchError:
      locale === "uk"
        ? "Вкажіть номер відділення Нової пошти."
        : locale === "ru"
          ? "Укажите номер отделения Новой почты."
          : "Enter the Nova Poshta branch number.",
    addressError:
      locale === "uk"
        ? "Вкажіть адресу для кур'єрської доставки."
        : locale === "ru"
          ? "Укажите адрес для курьерской доставки."
          : "Enter a delivery address for courier shipping.",
    genericError:
      locale === "uk"
        ? "Не вдалося оформити замовлення."
        : locale === "ru"
          ? "Не удалось оформить заказ."
          : "Could not place the order.",
  };

  const citySuggestions = useMemo(() => {
    const query = normalizeCityValue(form.deliveryCity);

    if (!query) {
      return ORDER_CITY_OPTIONS.slice(0, 8);
    }

    return ORDER_CITY_OPTIONS.filter((city) => normalizeCityValue(city).includes(query)).slice(0, 8);
  }, [form.deliveryCity]);

  const updateForm = <Key extends keyof CheckoutPrefill>(key: Key, value: CheckoutPrefill[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validate = () => {
    if (form.fullName.trim().length < 2) {
      return labels.fullNameError;
    }

    if (form.phone.trim().length < 7) {
      return labels.phoneError;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return labels.emailError;
    }

    if (form.deliveryCity.trim().length < 2) {
      return labels.cityError;
    }

    if (isCourier && form.deliveryAddress.trim().length < 5) {
      return labels.addressError;
    }

    if (!isCourier && form.deliveryBranch.trim().length < 1) {
      return labels.branchError;
    }

    return null;
  };

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const validationError = validate();
        setError(validationError);

        if (validationError) {
          return;
        }

        startTransition(async () => {
          try {
            const response = await fetch("/api/orders", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                locale,
                ...form,
              }),
            });

            const payload = (await response.json().catch(() => null)) as
              | { error?: string; orderId?: string }
              | null;

            if (!response.ok || !payload?.orderId) {
              throw new Error(payload?.error || labels.genericError);
            }

            router.push(`/checkout/success?order=${payload.orderId}`);
            router.refresh();
          } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : labels.genericError);
          }
        });
      }}
    >
      {hasAutofill ? (
        <div className="rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm leading-6 text-[color:var(--color-text-soft)]">
          {labels.autofill}
        </div>
      ) : null}

      <label className="grid gap-2">
        <span className="text-sm text-[color:var(--color-text-soft)]">{labels.fullName}</span>
        <input
          required
          value={form.fullName}
          onChange={(event) => updateForm("fullName", event.target.value)}
          className="h-12 rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-[color:var(--color-text-soft)]">{labels.phone}</span>
          <input
            required
            value={form.phone}
            onChange={(event) => updateForm("phone", event.target.value)}
            className="h-12 rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-[color:var(--color-text-soft)]">{labels.email}</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => updateForm("email", event.target.value)}
            className="h-12 rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          />
        </label>
      </div>

      <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4">
        <p className="text-sm font-medium text-[color:var(--color-text)]">{labels.delivery}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["NOVA_POSHTA_BRANCH", labels.branch],
              ["NOVA_POSHTA_COURIER", labels.courier],
            ] as const
          ).map(([method, label]) => {
            const active = form.deliveryMethod === method;

            return (
              <button
                key={method}
                type="button"
                onClick={() => updateForm("deliveryMethod", method)}
                className={[
                  "rounded-[1.1rem] border px-4 py-3 text-left transition",
                  active
                    ? "border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)]"
                    : "border-[color:var(--color-line)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-line-strong)]",
                ].join(" ")}
              >
                <span className="block text-sm font-medium text-[color:var(--color-text)]">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-[color:var(--color-text-soft)]">{labels.city}</span>
          <div className="relative">
            <input
              required
              value={form.deliveryCity}
              placeholder={labels.cityHint}
              onFocus={() => setCityOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setCityOpen(false), 120);
              }}
              onChange={(event) => {
                updateForm("deliveryCity", event.target.value);
                setCityOpen(true);
              }}
              className="h-12 w-full rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
            {cityOpen && citySuggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-10 grid gap-1 rounded-[1.2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-2 shadow-[var(--shadow-soft)]">
                {citySuggestions.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      updateForm("deliveryCity", city);
                      setCityOpen(false);
                    }}
                    className="rounded-[0.9rem] px-3 py-2 text-left text-sm text-[color:var(--color-text)] transition hover:bg-[color:var(--color-surface-elevated)]"
                  >
                    {city}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </label>

        {isCourier ? (
          <label className="grid gap-2">
            <span className="text-sm text-[color:var(--color-text-soft)]">{labels.addressField}</span>
            <input
              required
              value={form.deliveryAddress}
              placeholder={labels.addressPlaceholder}
              onChange={(event) => updateForm("deliveryAddress", event.target.value)}
              className="h-12 rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>
        ) : (
          <label className="grid gap-2">
            <span className="text-sm text-[color:var(--color-text-soft)]">{labels.branchField}</span>
            <input
              required
              value={form.deliveryBranch}
              placeholder={labels.branchPlaceholder}
              onChange={(event) => updateForm("deliveryBranch", event.target.value)}
              className="h-12 rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>
        )}
      </div>

      <label className="grid gap-2">
        <span className="text-sm text-[color:var(--color-text-soft)]">{labels.comment}</span>
        <textarea
          value={form.comment}
          placeholder={labels.commentHint}
          onChange={(event) => updateForm("comment", event.target.value)}
          className="min-h-28 rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
        />
      </label>

      {error ? (
        <p className="rounded-[1rem] border border-rose-500/30 bg-rose-500/8 px-4 py-3 text-sm text-rose-500">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3">
        <Button type="submit" className="h-12" disabled={pending}>
          {labels.submit}
        </Button>
        <p className="text-sm leading-6 text-[color:var(--color-text-soft)]">{labels.submitHint}</p>
      </div>
    </form>
  );
}
