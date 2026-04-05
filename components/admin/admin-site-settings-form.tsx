"use client";

import { useActionState } from "react";
import type { Category, Product } from "@prisma/client";
import { locales } from "@/lib/constants";
import { SITE_MODES, type SiteMode } from "@/lib/site-mode";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";

type SiteSettingsState = {
  status: "idle" | "error" | "success";
  message?: string;
};

type SiteSettingsAction = (
  state: SiteSettingsState,
  formData: FormData,
) => Promise<SiteSettingsState>;

export function AdminSiteSettingsForm({
  locale,
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
  const copy = {
    title:
      locale === "uk"
        ? "Налаштування магазину"
        : locale === "ru"
          ? "Настройки магазина"
          : "Store settings",
    assets:
      locale === "uk"
        ? "Файли бренду"
        : locale === "ru"
          ? "Файлы бренда"
          : "Brand assets",
    seo:
      locale === "uk"
        ? "Соцмережі та SEO"
        : locale === "ru"
          ? "Соцсети и SEO"
          : "Social and SEO",
    homepage:
      locale === "uk"
        ? "Головна сторінка"
        : locale === "ru"
          ? "Главная страница"
          : "Homepage",
    siteMode:
      locale === "uk" ? "Режим сайту" : locale === "ru" ? "Режим сайта" : "Site mode",
    siteModeHint:
      locale === "uk"
        ? "Store mode залишає storefront як звичний магазин. PC Build mode зміщує акценти на підбір комплектуючих, збірку та консультацію."
        : locale === "ru"
          ? "Store mode оставляет storefront как обычный магазин. PC Build mode смещает акценты на подбор комплектующих, сборку и консультацию."
          : "Store mode keeps the current storefront behavior. PC Build mode shifts the site toward custom PC selection, build requests, and consultation.",
    featured:
      locale === "uk"
        ? "Рекомендовані блоки"
        : locale === "ru"
          ? "Рекомендуемые блоки"
          : "Featured sections",
    save:
      locale === "uk"
        ? "Зберегти налаштування"
        : locale === "ru"
          ? "Сохранить настройки"
          : "Save settings",
    saving: locale === "uk" ? "Збереження..." : locale === "ru" ? "Сохранение..." : "Saving...",
  };

  const categoryLabel = (category: (typeof categories)[number]) =>
    category.translations.find((item) => item.locale === locale)?.name ??
    category.translations[0]?.name ??
    category.slug;

  const productLabel = (product: (typeof products)[number]) =>
    product.translations.find((item) => item.locale === locale)?.name ??
    product.translations[0]?.name ??
    product.slug;

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="logoPathCurrent" value={initialValues.logoPath} />
      <input type="hidden" name="faviconPathCurrent" value={initialValues.faviconPath} />

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.title}</h2>
          <AdminSubmitButton pendingLabel={copy.saving}>{copy.save}</AdminSubmitButton>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] xl:col-span-3">
            <span>{copy.siteMode}</span>
            <select
              name="siteMode"
              defaultValue={initialValues.siteMode}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            >
              <option value={SITE_MODES.store}>
                {locale === "uk" ? "Режим магазину" : locale === "ru" ? "Режим магазина" : "Store mode"}
              </option>
              <option value={SITE_MODES.pcBuild}>
                {locale === "uk" ? "Режим збірки ПК" : locale === "ru" ? "Режим сборки ПК" : "PC Build mode"}
              </option>
            </select>
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]/80">
              {copy.siteModeHint}
            </span>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>{locale === "uk" ? "Назва магазину" : locale === "ru" ? "Название магазина" : "Brand name"}</span><input name="brandName" defaultValue={initialValues.brandName} required className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>{locale === "uk" ? "Коротка назва" : locale === "ru" ? "Короткое название" : "Short brand name"}</span><input name="shortBrandName" defaultValue={initialValues.shortBrandName} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>{locale === "uk" ? "Текст логотипа" : locale === "ru" ? "Текст логотипа" : "Logo text"}</span><input name="logoText" defaultValue={initialValues.logoText} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>Email</span><input name="supportEmail" type="email" defaultValue={initialValues.supportEmail} required className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>{locale === "uk" ? "Телефон" : locale === "ru" ? "Телефон" : "Phone"}</span><input name="supportPhone" defaultValue={initialValues.supportPhone} required className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>{locale === "uk" ? "Адреса" : locale === "ru" ? "Адрес" : "Address"}</span><input name="address" defaultValue={initialValues.address} required className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.assets}</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>{locale === "uk" ? "Файл логотипа" : locale === "ru" ? "Файл логотипа" : "Logo file"}</span><input name="logoFile" type="file" accept="image/*" className="rounded-[1rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 text-[color:var(--color-text-soft)]" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>{locale === "uk" ? "Файл favicon" : locale === "ru" ? "Файл favicon" : "Favicon file"}</span><input name="faviconFile" type="file" accept="image/*,.ico" className="rounded-[1rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 text-[color:var(--color-text-soft)]" /></label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.seo}</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>Facebook</span><input name="facebookUrl" defaultValue={initialValues.facebookUrl} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>Instagram</span><input name="instagramUrl" defaultValue={initialValues.instagramUrl} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>Telegram</span><input name="telegramUrl" defaultValue={initialValues.telegramUrl} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>YouTube</span><input name="youtubeUrl" defaultValue={initialValues.youtubeUrl} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2"><span>Meta title</span><input name="metaTitle" defaultValue={initialValues.metaTitle} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2"><span>Meta description</span><textarea name="metaDescription" defaultValue={initialValues.metaDescription} className="min-h-24 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none" /></label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.homepage}</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2 xl:col-span-3"><span>{locale === "uk" ? "Заголовок hero" : locale === "ru" ? "Заголовок hero" : "Hero title"}</span><input name="heroTitle" defaultValue={initialValues.heroTitle} required className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2 xl:col-span-3"><span>{locale === "uk" ? "Підзаголовок hero" : locale === "ru" ? "Подзаголовок hero" : "Hero subtitle"}</span><textarea name="heroSubtitle" defaultValue={initialValues.heroSubtitle} required className="min-h-24 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>{locale === "uk" ? "Текст кнопки" : locale === "ru" ? "Текст кнопки" : "Hero CTA label"}</span><input name="heroCtaLabel" defaultValue={initialValues.heroCtaLabel} required className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2"><span>{locale === "uk" ? "Посилання кнопки" : locale === "ru" ? "Ссылка кнопки" : "Hero CTA href"}</span><input name="heroCtaHref" defaultValue={initialValues.heroCtaHref} required className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>{locale === "uk" ? "Валюта за замовчуванням" : locale === "ru" ? "Валюта по умолчанию" : "Default currency"}</span><input name="defaultCurrency" defaultValue={initialValues.defaultCurrency} required className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 uppercase text-[color:var(--color-text)] outline-none" /></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>{locale === "uk" ? "Мова за замовчуванням" : locale === "ru" ? "Язык по умолчанию" : "Default locale"}</span><select name="defaultLocale" defaultValue={initialValues.defaultLocale} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none">{locales.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]"><span>{locale === "uk" ? "Текст watermark" : locale === "ru" ? "Текст watermark" : "Watermark text"}</span><input name="watermarkText" defaultValue={initialValues.watermarkText} required className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none" /></label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.featured}</h3>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{locale === "uk" ? "Рекомендовані категорії" : locale === "ru" ? "Рекомендуемые категории" : "Featured categories"}</span>
            <select name="featuredCategorySlugs" multiple defaultValue={initialValues.featuredCategorySlugs} className="min-h-56 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none">
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>{categoryLabel(category)}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{locale === "uk" ? "Рекомендовані товари" : locale === "ru" ? "Рекомендуемые товары" : "Featured products"}</span>
            <select name="featuredProductIds" multiple defaultValue={initialValues.featuredProductIds} className="min-h-56 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none">
              {products.map((product) => (
                <option key={product.id} value={product.id}>{productLabel(product)}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {state.message ? (
        <p className={state.status === "success" ? "rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200" : "rounded-[1.2rem] border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300"}>{state.message}</p>
      ) : null}
    </form>
  );
}
