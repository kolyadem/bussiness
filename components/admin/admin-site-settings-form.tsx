"use client";

import { useActionState } from "react";
import type { Category, Product } from "@prisma/client";
import { defaultLocale } from "@/lib/constants";
import { SITE_MODES, type SiteMode } from "@/lib/site-mode";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { storedMinorUnitsToDisplayPrice } from "@/lib/utils";

type SiteSettingsState = {
  status: "idle" | "error" | "success";
  message?: string;
};

type SiteSettingsAction = (
  state: SiteSettingsState,
  formData: FormData,
) => Promise<SiteSettingsState>;

const COPY = {
  title: "Налаштування магазину",
  assets: "Файли бренду",
  seo: "Соцмережі та SEO",
  homepage: "Головна сторінка",
  siteMode: "Режим сайту",
  siteModeHint:
    "Режим магазину залишає storefront як звичний магазин. Режим збірки ПК зміщує акценти на підбір комплектуючих, збірку та консультацію.",
  featured: "Рекомендовані блоки",
  save: "Зберегти налаштування",
  saving: "Збереження...",
  storeMode: "Режим магазину",
  pcBuildMode: "Режим збірки ПК",
  brandName: "Назва магазину",
  shortBrandName: "Коротка назва",
  logoText: "Текст логотипа",
  phone: "Телефон",
  address: "Адреса",
  logoFile: "Файл логотипа",
  faviconFile: "Файл favicon",
  heroTitle: "Заголовок hero",
  heroSubtitle: "Підзаголовок hero",
  heroCtaLabel: "Текст кнопки",
  heroCtaHref: "Посилання кнопки",
  defaultCurrency: "Валюта за замовчуванням",
  watermarkText: "Текст watermark",
  featuredCategories: "Рекомендовані категорії",
  featuredProducts: "Рекомендовані товари",
  assemblyBaseFee: "\u0424\u0456\u043a\u0441\u043e\u0432\u0430\u043d\u0430 \u0447\u0430\u0441\u0442\u0438\u043d\u0430 \u0437\u0431\u0456\u0440\u043a\u0438 \u041f\u041a (\u0433\u0440\u043d)",
  assemblyBaseFeeHint:
    "\u0412 \u0430\u0434\u043c\u0456\u043d\u0446\u0456 \u0432\u0432\u043e\u0434\u0438\u0442\u044c\u0441\u044f \u0441\u0443\u043c\u0430 \u0432 \u0433\u0440\u0438\u0432\u043d\u044f\u0445. \u0423 \u0411\u0414 \u0432\u043e\u043d\u0430 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u043d\u043e \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454\u0442\u044c\u0441\u044f \u0432 \u043a\u043e\u043f\u0456\u0439\u043a\u0430\u0445.",
  assemblyPercent: "Відсоток від суми комплектуючих (%)",
  assemblyPercentHint:
    "Ціле число від 0 до 100 (наприклад 2 означає 2%). Розрахунок: база + відсоток від суми комплектуючих. Промокод FREE_BUILD знімає повну суму збірки.",
};

export function AdminSiteSettingsForm({
  locale: _locale,
  action,
  initialValues,
  categories,
  products,
}: {
  locale: string;
  action: SiteSettingsAction;
  initialValues: {
    siteMode: SiteMode;
    brandName: string;
    shortBrandName: string;
    logoText: string;
    logoPath: string;
    supportEmail: string;
    supportPhone: string;
    address: string;
    facebookUrl: string;
    instagramUrl: string;
    telegramUrl: string;
    youtubeUrl: string;
    metaTitle: string;
    metaDescription: string;
    faviconPath: string;
    defaultCurrency: string;
    defaultLocale: string;
    watermarkText: string;
    heroTitle: string;
    heroSubtitle: string;
    heroCtaLabel: string;
    heroCtaHref: string;
    featuredCategorySlugs: string[];
    featuredProductIds: string[];
    assemblyBaseFeeUah: number;
    assemblyPercent: number;
  };
  categories: Array<
    Category & {
      translations: Array<{
        locale: string;
        name: string;
      }>;
    }
  >;
  products: Array<
    Product & {
      translations: Array<{
        locale: string;
        name: string;
      }>;
    }
  >;
}) {
  const [state, formAction] = useActionState(action, { status: "idle" });

  const categoryLabel = (category: (typeof categories)[number]) =>
    category.translations.find((item) => item.locale === defaultLocale)?.name ??
    category.translations[0]?.name ??
    category.slug;

  const productLabel = (product: (typeof products)[number]) =>
    product.translations.find((item) => item.locale === defaultLocale)?.name ??
    product.translations[0]?.name ??
    product.slug;

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="logoPathCurrent" value={initialValues.logoPath} />
      <input type="hidden" name="faviconPathCurrent" value={initialValues.faviconPath} />
      <input type="hidden" name="defaultLocale" value="uk" />

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{COPY.title}</h2>
          <AdminSubmitButton pendingLabel={COPY.saving}>{COPY.save}</AdminSubmitButton>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] xl:col-span-3">
            <span>{COPY.siteMode}</span>
            <select
              name="siteMode"
              defaultValue={initialValues.siteMode}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            >
              <option value={SITE_MODES.store}>{COPY.storeMode}</option>
              <option value={SITE_MODES.pcBuild}>{COPY.pcBuildMode}</option>
            </select>
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]/80">
              {COPY.siteModeHint}
            </span>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-1 xl:col-span-1">
            <span>{COPY.assemblyBaseFee}</span>
            <input
              name="assemblyBaseFeeUah"
              type="number"
              min={0}
              step={1}
              defaultValue={storedMinorUnitsToDisplayPrice(initialValues.assemblyBaseFeeUah)}
              className="h-11 max-w-md rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]/80">{COPY.assemblyBaseFeeHint}</span>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-1 xl:col-span-1">
            <span>{COPY.assemblyPercent}</span>
            <input
              name="assemblyPercent"
              type="number"
              min={0}
              max={100}
              step={1}
              defaultValue={initialValues.assemblyPercent}
              className="h-11 max-w-md rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]/80">{COPY.assemblyPercentHint}</span>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.brandName}</span>
            <input
              name="brandName"
              defaultValue={initialValues.brandName}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.shortBrandName}</span>
            <input
              name="shortBrandName"
              defaultValue={initialValues.shortBrandName}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.logoText}</span>
            <input
              name="logoText"
              defaultValue={initialValues.logoText}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>Email</span>
            <input
              name="supportEmail"
              type="email"
              defaultValue={initialValues.supportEmail}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.phone}</span>
            <input
              name="supportPhone"
              defaultValue={initialValues.supportPhone}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.address}</span>
            <input
              name="address"
              defaultValue={initialValues.address}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{COPY.assets}</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.logoFile}</span>
            <input
              name="logoFile"
              type="file"
              accept="image/*"
              className="rounded-[1rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 text-[color:var(--color-text-soft)]"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.faviconFile}</span>
            <input
              name="faviconFile"
              type="file"
              accept="image/*,.ico"
              className="rounded-[1rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 text-[color:var(--color-text-soft)]"
            />
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{COPY.seo}</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>Facebook</span>
            <input
              name="facebookUrl"
              defaultValue={initialValues.facebookUrl}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>Instagram</span>
            <input
              name="instagramUrl"
              defaultValue={initialValues.instagramUrl}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>Telegram</span>
            <input
              name="telegramUrl"
              defaultValue={initialValues.telegramUrl}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>YouTube</span>
            <input
              name="youtubeUrl"
              defaultValue={initialValues.youtubeUrl}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2">
            <span>Meta title</span>
            <input
              name="metaTitle"
              defaultValue={initialValues.metaTitle}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2">
            <span>Meta description</span>
            <textarea
              name="metaDescription"
              defaultValue={initialValues.metaDescription}
              className="min-h-24 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
            />
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{COPY.homepage}</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2 xl:col-span-3">
            <span>{COPY.heroTitle}</span>
            <input
              name="heroTitle"
              defaultValue={initialValues.heroTitle}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2 xl:col-span-3">
            <span>{COPY.heroSubtitle}</span>
            <textarea
              name="heroSubtitle"
              defaultValue={initialValues.heroSubtitle}
              className="min-h-24 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.heroCtaLabel}</span>
            <input
              name="heroCtaLabel"
              defaultValue={initialValues.heroCtaLabel}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2">
            <span>{COPY.heroCtaHref}</span>
            <input
              name="heroCtaHref"
              defaultValue={initialValues.heroCtaHref}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.defaultCurrency}</span>
            <input
              name="defaultCurrency"
              defaultValue={initialValues.defaultCurrency}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 uppercase text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.watermarkText}</span>
            <input
              name="watermarkText"
              defaultValue={initialValues.watermarkText}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{COPY.featured}</h3>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.featuredCategories}</span>
            <select
              name="featuredCategorySlugs"
              multiple
              defaultValue={initialValues.featuredCategorySlugs}
              className="min-h-56 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.featuredProducts}</span>
            <select
              name="featuredProductIds"
              multiple
              defaultValue={initialValues.featuredProductIds}
              className="min-h-56 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {productLabel(product)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
              : "rounded-[1.2rem] border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
