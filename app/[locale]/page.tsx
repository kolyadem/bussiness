import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ConfiguratorFeatureCard } from "@/components/configurator/configurator-feature-card";
import { ProductCard } from "@/components/catalog/product-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";
import { getSiteExperienceCopy } from "@/lib/site-experience";
import { SITE_MODES, normalizeSiteMode } from "@/lib/site-mode";
import { getAbsoluteUrl, pageMetadata, sanitizeJsonLd } from "@/lib/storefront/seo";
import { getHomepageData, mapProduct, pickByLocale } from "@/lib/storefront/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(
    locale,
    "homeSeoTitle",
    "Збірка ПК, комплектуючі та периферія — конфігуратор і каталог.",
    "",
  );
}

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const data = await getHomepageData(locale);
  const siteMode = normalizeSiteMode(data.settings?.siteMode);
  const experience = getSiteExperienceCopy(locale, siteMode);
  const isPcBuild = siteMode === SITE_MODES.pcBuild;
  const hero = data.heroBanners[0];
  const heroTranslation = hero ? pickByLocale(hero.translations, locale) : null;
  const fallbackHeroArt = "/hero/orbit.svg";
  const heroBgSrc = hero?.image ?? fallbackHeroArt;
  const heroTitleDefault = t("homeHeroTitle");
  const heroSubtitleDefault = t("homeHeroSubtitle");
  const featuredProducts = data.featuredProducts.slice(0, 4).map((product) => mapProduct(product, locale));
  const promoBanners = data.promoBanners.slice(0, 2).map((banner) => {
    const translation = pickByLocale(banner.translations, locale);

    return {
      id: banner.id,
      href: banner.href,
      image: banner.image,
      title: translation.title,
      subtitle: translation.subtitle,
      ctaLabel: translation.ctaLabel,
    };
  });
  const supportEmailLd = data.settings?.supportEmail?.trim();
  const supportPhoneLd = data.settings?.supportPhone?.trim();
  const contactPointLd =
    supportEmailLd || supportPhoneLd
      ? [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            ...(supportEmailLd ? { email: supportEmailLd } : {}),
            ...(supportPhoneLd ? { telephone: supportPhoneLd } : {}),
          },
        ]
      : [];

  const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: data.settings?.brandName || "Lumina Tech",
    url: getAbsoluteUrl("/"),
    logo: getAbsoluteUrl(data.settings?.logoPath || "/favicon.ico"),
    ...(contactPointLd.length > 0 ? { contactPoint: contactPointLd } : {}),
    sameAs: [
      data.settings?.facebookUrl,
      data.settings?.instagramUrl,
      data.settings?.telegramUrl,
      data.settings?.youtubeUrl,
    ]
      .map((url) => url?.trim())
      .filter((url): url is string => Boolean(url)),
  };
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: data.settings?.brandName || "Lumina Tech",
    url: getAbsoluteUrl("/"),
    inLanguage: "uk",
    potentialAction: {
      "@type": "SearchAction",
      target: `${getAbsoluteUrl("/catalog")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main className="storefront-shell mx-auto px-4 py-8 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(organizationStructuredData) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(websiteStructuredData) }}
      />
      <section className="relative overflow-hidden rounded-[2.6rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-4 py-10 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:px-8 sm:py-16 lg:px-10 lg:py-18 xl:px-12 xl:py-20">
        <div
          className={`pointer-events-none absolute inset-0 ${hero?.image ? "opacity-[0.12]" : "opacity-[0.2]"}`}
          aria-hidden
        >
          <Image
            src={heroBgSrc}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
            unoptimized={heroBgSrc.endsWith(".svg")}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[color:var(--color-accent)]/[0.12] via-transparent to-[color:var(--color-surface)]/85"
          aria-hidden
        />

        <div className="relative mx-auto flex min-w-0 max-w-5xl flex-col items-center px-1 text-center sm:px-0">
          <h1 className="font-heading text-[clamp(1.65rem,4.2vw+0.6rem,2.25rem)] font-semibold leading-tight tracking-[-0.06em] text-[color:var(--color-text)] sm:text-5xl lg:text-6xl">
            {isPcBuild
              ? "Зберемо ПК під ваш бюджет і задачі"
              : (heroTranslation?.title ?? data.settings?.heroTitle ?? heroTitleDefault)}
          </h1>
          {!isPcBuild ? (
            <p className="mt-5 max-w-2xl text-sm leading-8 text-[color:var(--color-text-soft)]">
              {heroTranslation?.subtitle ?? data.settings?.heroSubtitle ?? heroSubtitleDefault}
            </p>
          ) : null}
          <div className="mt-8 flex w-full flex-col gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              href={
                isPcBuild
                  ? "/build-request?source=homepage-hero"
                  : hero?.href ?? data.settings?.heroCtaHref ?? "/catalog"
              }
              className="w-full sm:w-auto"
            >
              <Button className="w-full sm:min-w-52">
                {isPcBuild
                  ? experience?.heroPrimary ?? "Отримати підбір збірки"
                  : heroTranslation?.ctaLabel ?? data.settings?.heroCtaLabel ?? t("heroButton")}
              </Button>
            </Link>
            <Link href={isPcBuild ? "/configurator" : "/wishlist"} className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:min-w-52">
                {isPcBuild
                  ? experience?.heroSecondary ?? "Перейти до компонентів"
                  : t("heroSecondary")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <ConfiguratorFeatureCard locale={locale} siteMode={siteMode} />
      </section>

      <section className="mt-10">
        <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <h2 className="min-w-0 font-heading text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)] sm:text-3xl">
            {isPcBuild ? experience?.featuredTitle ?? t("featured") : t("featured")}
          </h2>
          <Link
            href="/catalog"
            className="shrink-0 self-start text-sm text-[color:var(--color-text-soft)] transition hover:text-[color:var(--color-text)] sm:self-auto"
          >
            {t("continueShopping")}
          </Link>
        </div>
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} siteMode={siteMode} />
          ))}
        </div>
      </section>

      {isPcBuild && experience ? (
        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {experience.serviceCards.map((card) => (
            <article
              key={card.title}
              className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-accent-strong)]">
                {experience.navConfigurator}
              </p>
              <h2 className="mt-4 font-heading text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
                {card.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[color:var(--color-text-soft)]">
                {card.text}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      {promoBanners.length > 0 ? (
        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          {promoBanners.map((banner) => (
            <Link
              key={banner.id}
              href={banner.href ?? "/catalog"}
              className="relative overflow-hidden rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] transition hover:border-[color:var(--color-accent-line)]"
            >
              {banner.image ? (
                <div className="pointer-events-none absolute inset-0 opacity-[0.1]">
                  <Image src={banner.image} alt={banner.title} fill className="object-cover" />
                </div>
              ) : null}
              <div className="relative">
                <p className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
                  {banner.title}
                </p>
                {banner.subtitle ? (
                  <p className="mt-3 text-sm leading-7 text-[color:var(--color-text-soft)]">
                    {banner.subtitle}
                  </p>
                ) : null}
                {banner.ctaLabel ? (
                  <p className="mt-5 text-sm font-medium text-[color:var(--color-text)]">
                    {banner.ctaLabel}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </section>
      ) : null}
    </main>
  );
}
