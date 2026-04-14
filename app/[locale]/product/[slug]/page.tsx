import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShieldCheck, Sparkles, Truck } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductActions } from "@/components/product/product-actions";
import { ProductMediaGallery } from "@/components/product/product-media-gallery";
import { RecentlyViewedTracker } from "@/components/product/recently-viewed-tracker";
import { Link } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";
import { getSiteExperienceCopy } from "@/lib/site-experience";
import { SITE_MODES } from "@/lib/site-mode";
import { getSiteMode, getSiteSettingsRecord } from "@/lib/site-config";
import { getProductRecommendationCollections } from "@/lib/storefront/conversion";
import { formatPrice, formatPriceOrPlaceholder, isPlaceholderPrice } from "@/lib/utils";
import {
  buildAlternates,
  buildRobots,
  getAbsoluteUrl,
  getOpenGraphLocale,
  sanitizeJsonLd,
} from "@/lib/storefront/seo";
import {
  getProductBySlug,
  getRecentlyViewedProducts,
  mapProduct,
} from "@/lib/storefront/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {};
  }

  const mapped = mapProduct(product, locale);
  const images = (mapped.gallery.length > 0 ? mapped.gallery : [mapped.heroImage]).map((image) =>
    getAbsoluteUrl(image),
  );
  const title = mapped.seoTitle || mapped.name;
  const description = mapped.seoDescription || mapped.shortDescription;

  return {
    title,
    description,
    alternates: buildAlternates(`/product/${slug}`, locale),
    robots: buildRobots(true),
    openGraph: {
      title,
      description,
      type: "article",
      url: getAbsoluteUrl(`/product/${slug}`),
      locale: getOpenGraphLocale(locale),
      images,
    },
    twitter: {
      card: images.length > 0 ? "summary_large_image" : "summary",
      title,
      description,
      images,
    },
  };
}

function getReviewSummary(
  reviews: Array<{
    rating: number;
  }>,
) {
  if (reviews.length === 0) {
    return 0;
  }

  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale });
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [recommendations, recentlyViewed, siteMode, siteSettings] = await Promise.all([
    getProductRecommendationCollections(product, locale),
    getRecentlyViewedProducts(product.id),
    getSiteMode(),
    getSiteSettingsRecord(),
  ]);
  const experience = getSiteExperienceCopy(locale, siteMode);
  const isPcBuild = siteMode === SITE_MODES.pcBuild;
  const mapped = mapProduct(product, locale);
  const reviewAverage = getReviewSummary(mapped.reviews);
  const specEntries = Object.entries(mapped.specs);
  const productImages = mapped.gallery.length > 0 ? mapped.gallery : [mapped.heroImage];
  const savings =
    typeof mapped.oldPrice === "number" && mapped.oldPrice > mapped.price
      ? mapped.oldPrice - mapped.price
      : null;
  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: mapped.name,
    description: mapped.seoDescription || mapped.shortDescription,
    image: productImages.map((image) => getAbsoluteUrl(image)),
    sku: mapped.sku,
    brand: {
      "@type": "Brand",
      name: siteSettings?.brandName ?? mapped.category.name,
    },
    category: mapped.category.name,
    offers: {
      "@type": "Offer",
      priceCurrency: mapped.currency,
      price: (mapped.price / 100).toFixed(2),
      availability: `https://schema.org/${
        mapped.inventoryStatus === "OUT_OF_STOCK" ? "OutOfStock" : "InStock"
      }`,
      url: getAbsoluteUrl(`/product/${mapped.slug}`),
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(mapped.reviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(reviewAverage.toFixed(1)),
            reviewCount: mapped.reviews.length,
          },
        }
      : {}),
  };
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Головна",
        item: getAbsoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Каталог",
        item: getAbsoluteUrl("/catalog"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: mapped.category.name,
        item: getAbsoluteUrl(`/catalog?category=${mapped.category.slug}`),
      },
      {
        "@type": "ListItem",
        position: 4,
        name: mapped.name,
        item: getAbsoluteUrl(`/product/${mapped.slug}`),
      },
    ],
  };

  const assuranceItems = [
    {
      title: "Швидке оформлення",
      body: "Додайте товар у кошик або збережіть у вибране, щоб повернутися до нього пізніше.",
      icon: Sparkles,
    },
    {
      title: "Надійна доставка",
      body: "Акуратне пакування та швидке підтвердження замовлення після оформлення.",
      icon: Truck,
    },
    {
      title: "Перевірений товар",
      body: "Основні характеристики вже зібрані нижче, щоб рішення приймалося без зайвого шуму.",
      icon: ShieldCheck,
    },
  ];

  return (
    <main className="storefront-shell mx-auto w-full px-4 py-6 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(productStructuredData) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(breadcrumbStructuredData) }}
      />
      <RecentlyViewedTracker productId={mapped.id} />

      <Link
        href="/catalog"
        className="inline-flex text-sm text-[color:var(--color-text-soft)] transition hover:text-[color:var(--color-text)]"
      >
        {t("backToCatalog")}
      </Link>

      <section className="mt-5 grid min-w-0 gap-6 xl:grid-cols-[1.02fr_0.98fr] xl:gap-8 2xl:grid-cols-[1.06fr_0.94fr]">
        <div className="min-w-0 space-y-5">
          <ProductMediaGallery
            images={productImages}
            name={mapped.name}
            watermarkText={siteSettings?.watermarkText ?? mapped.category.name}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            {assuranceItems.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-[1.6rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-[color:var(--color-text)]">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-soft)]">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <section className="rounded-[2.4rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-5 shadow-[var(--shadow-strong)] sm:p-6">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[color:var(--color-text)]">
                {mapped.category.name}
              </span>
              <span className="rounded-full border border-[color:var(--color-line-strong)] bg-transparent px-3 py-2 text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-soft)]">
                {mapped.sku}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <h1 className="max-w-3xl font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
                {mapped.name}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[color:var(--color-text-soft)]">
                {mapped.shortDescription}
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.8rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] p-5 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                  Ціна зараз
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <p className="font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)]">
                    {formatPriceOrPlaceholder(mapped.price, locale, mapped.currency)}
                  </p>
                  {!isPlaceholderPrice(mapped.price) && mapped.oldPrice ? (
                    <p className="pb-1 text-lg text-[color:var(--color-text-soft)] line-through">
                      {formatPrice(mapped.oldPrice, locale, mapped.currency)}
                    </p>
                  ) : null}
                </div>
                {!isPlaceholderPrice(mapped.price) && savings ? (
                  <p className="mt-3 text-sm text-[color:var(--color-accent-strong)]">
                    {`Економія ${formatPrice(savings, locale, mapped.currency)}`}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4">
                <div className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                    Наявність
                  </p>
                  <p className="mt-2 text-sm font-medium text-[color:var(--color-text)]">
                    {mapped.inventoryLabel}
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                    Рейтинг
                  </p>
                  <p className="mt-2 text-sm font-medium text-[color:var(--color-text)]">
                    {mapped.reviews.length > 0 ? `${reviewAverage.toFixed(1)} / 5` : t("productReviews")}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-[1.9rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                {isPcBuild
                  ? experience?.productActionPanelTitle ?? "Наступний крок"
                  : "Дія"}
              </p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">
                {isPcBuild
                  ? experience?.productActionPanelBody ??
                    "Додайте компонент у сценарій збірки або перейдіть до configurator, щоб зібрати ПК під свої задачі."
                  : "Додайте товар у кошик, збережіть у вибране або порівняйте з іншими моделями."}
              </p>
              <div className="mt-5">
                <ProductActions
                  productId={mapped.id}
                  siteMode={siteMode}
                  productCategorySlug={mapped.category.slug}
                  context="product"
                  purchasable={!isPlaceholderPrice(mapped.price)}
                />
              </div>
            </div>
          </section>

          {specEntries.length > 0 ? (
            <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
                    {t("productSpecs")}
                  </h2>
                  <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                    Ключові характеристики зібрані в одному місці.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {specEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-col gap-1 rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <span className="min-w-0 shrink capitalize text-[color:var(--color-text-soft)] sm:max-w-[45%]">
                      {key}
                    </span>
                    <span className="min-w-0 break-words font-medium text-[color:var(--color-text)] sm:text-right">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {t("productDescription")}
          </h2>
          <p className="mt-4 text-sm leading-8 text-[color:var(--color-text-soft)]">{mapped.description}</p>
        </div>

        <div className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
                {t("productReviews")}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                {mapped.reviews.length > 0
                  ? `${reviewAverage.toFixed(1)} / 5 · ${mapped.reviews.length}`
                  : "Поки без відгуків"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {mapped.reviews.length > 0 ? (
              mapped.reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-[color:var(--color-text)]">{review.author}</p>
                    <p className="text-sm text-[color:var(--color-text-soft)]">{review.rating}/5</p>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[color:var(--color-text)]">{review.title}</p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">{review.body}</p>
                </article>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-5 text-sm text-[color:var(--color-text-soft)]">
                Для цього товару ще немає опублікованих відгуків.
              </div>
            )}
          </div>
        </div>
      </section>

      {recentlyViewed.length > 0 ? (
        <section className="mt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
                Нещодавно переглянуті
              </h2>
              <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                Швидкий шлях назад до моделей, які вже привернули увагу.
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {recentlyViewed.map((item) => (
              <ProductCard
                key={item.id}
                product={mapProduct(item, locale)}
                locale={locale}
                siteMode={siteMode}
              />
            ))}
          </div>
        </section>
      ) : null}

      {recommendations.similar.length > 0 ? (
        <section className="mt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
                Схожі товари
              </h2>
              <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                Схожі товари з тієї ж категорії, які легко порівняти між собою.
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {recommendations.similar.map((item) => (
              <ProductCard key={item.id} product={item} locale={locale} siteMode={siteMode} />
            ))}
          </div>
        </section>
      ) : null}

      {recommendations.betterVariant || recommendations.valueChoice ? (
        <section className="mt-10">
          <div className="mb-6">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
              Розумний вибір
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
              Два короткі сценарії, якщо хочеться сильніший або більш зібраний варіант.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {recommendations.betterVariant ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
                    Кращий варіант
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                    М’який апгрейд у тому ж класі, коли хочеться більше запасу.
                  </p>
                </div>
                <ProductCard product={recommendations.betterVariant} locale={locale} siteMode={siteMode} />
              </div>
            ) : null}

            {recommendations.valueChoice ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
                    Вигідний вибір
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                    Ближча до бюджету альтернатива з хорошим балансом ціни та класу.
                  </p>
                </div>
                <ProductCard product={recommendations.valueChoice} locale={locale} siteMode={siteMode} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
