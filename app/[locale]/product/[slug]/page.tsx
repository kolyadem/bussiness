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
import { getSiteMode } from "@/lib/site-config";
import { getProductRecommendationCollections } from "@/lib/storefront/conversion";
import { formatPrice } from "@/lib/utils";
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
      url: getAbsoluteUrl(`/${locale}/product/${slug}`),
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

  const [recommendations, recentlyViewed, siteMode] = await Promise.all([
    getProductRecommendationCollections(product, locale),
    getRecentlyViewedProducts(product.id),
    getSiteMode(),
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
      name: mapped.brand.name,
    },
    category: mapped.category.name,
    offers: {
      "@type": "Offer",
      priceCurrency: mapped.currency,
      price: (mapped.price / 100).toFixed(2),
      availability: `https://schema.org/${
        mapped.inventoryStatus === "OUT_OF_STOCK" ? "OutOfStock" : "InStock"
      }`,
      url: getAbsoluteUrl(`/${locale}/product/${mapped.slug}`),
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
        name: locale === "uk" ? "Головна" : locale === "ru" ? "Главная" : "Home",
        item: getAbsoluteUrl(`/${locale}`),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: locale === "uk" ? "Каталог" : locale === "ru" ? "Каталог" : "Catalog",
        item: getAbsoluteUrl(`/${locale}/catalog`),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: mapped.category.name,
        item: getAbsoluteUrl(`/${locale}/catalog?category=${mapped.category.slug}`),
      },
      {
        "@type": "ListItem",
        position: 4,
        name: mapped.name,
        item: getAbsoluteUrl(`/${locale}/product/${mapped.slug}`),
      },
    ],
  };

  const assuranceItems = [
    {
      title: locale === "uk" ? "Швидке оформлення" : locale === "ru" ? "Быстрое оформление" : "Fast order flow",
      body:
        locale === "uk"
          ? "Додайте товар у кошик або збережіть у вибране, щоб повернутися до нього пізніше."
          : locale === "ru"
            ? "Добавьте товар в корзину или сохраните в избранное, чтобы вернуться позже."
            : "Add to cart now or save it for later without losing momentum.",
      icon: Sparkles,
    },
    {
      title: locale === "uk" ? "Надійна доставка" : locale === "ru" ? "Надёжная доставка" : "Safe delivery",
      body:
        locale === "uk"
          ? "Акуратне пакування та швидке підтвердження замовлення після оформлення."
          : locale === "ru"
            ? "Аккуратная упаковка и быстрое подтверждение заказа после оформления."
            : "Careful packaging and quick confirmation after checkout.",
      icon: Truck,
    },
    {
      title: locale === "uk" ? "Перевірений товар" : locale === "ru" ? "Проверенный товар" : "Trusted product",
      body:
        locale === "uk"
          ? "Основні характеристики вже зібрані нижче, щоб рішення приймалося без зайвого шуму."
          : locale === "ru"
            ? "Ключевые характеристики уже собраны ниже, чтобы выбирать было проще."
            : "Core specs are already summarized below so the choice feels simple.",
      icon: ShieldCheck,
    },
  ];

  return (
    <main className="storefront-shell mx-auto w-full px-4 py-8 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
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

      <section className="mt-6 grid gap-8 xl:grid-cols-[1.02fr_0.98fr] xl:gap-10 2xl:grid-cols-[1.06fr_0.94fr]">
        <div className="space-y-6">
          <ProductMediaGallery
            images={productImages}
            name={mapped.name}
            brandName={mapped.brand.name}
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

        <div className="space-y-6">
          <section className="rounded-[2.4rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-6 shadow-[var(--shadow-strong)] sm:p-8">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-soft)]">
                {mapped.brand.name}
              </span>
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
                  {locale === "uk" ? "Ціна зараз" : locale === "ru" ? "Цена сейчас" : "Price now"}
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <p className="font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)]">
                    {formatPrice(mapped.price, locale, mapped.currency)}
                  </p>
                  {mapped.oldPrice ? (
                    <p className="pb-1 text-lg text-[color:var(--color-text-soft)] line-through">
                      {formatPrice(mapped.oldPrice, locale, mapped.currency)}
                    </p>
                  ) : null}
                </div>
                {savings ? (
                  <p className="mt-3 text-sm text-[color:var(--color-accent-strong)]">
                    {locale === "uk"
                      ? `Економія ${formatPrice(savings, locale, mapped.currency)}`
                      : locale === "ru"
                        ? `Экономия ${formatPrice(savings, locale, mapped.currency)}`
                        : `Save ${formatPrice(savings, locale, mapped.currency)}`}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4">
                <div className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                    {locale === "uk" ? "Наявність" : locale === "ru" ? "Наличие" : "Availability"}
                  </p>
                  <p className="mt-2 text-sm font-medium text-[color:var(--color-text)]">
                    {mapped.inventoryLabel}
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                    {locale === "uk" ? "Рейтинг" : locale === "ru" ? "Рейтинг" : "Rating"}
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
                  ? experience?.productActionPanelTitle ??
                    (locale === "uk" ? "Наступний крок" : locale === "ru" ? "Следующий шаг" : "Next step")
                  : locale === "uk"
                    ? "Дія"
                    : locale === "ru"
                      ? "Действие"
                      : "Action"}
              </p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">
                {isPcBuild
                  ? experience?.productActionPanelBody ??
                    (locale === "uk"
                      ? "Додайте компонент у сценарій збірки або перейдіть до configurator, щоб зібрати ПК під свої задачі."
                      : locale === "ru"
                        ? "Добавьте компонент в сценарий сборки или перейдите в configurator, чтобы собрать ПК под свои задачи."
                        : "Add this component into a build flow or jump into the configurator to shape a PC around your goals.")
                  : locale === "uk"
                    ? "Додайте товар у кошик, збережіть у вибране або порівняйте з іншими моделями."
                    : locale === "ru"
                      ? "Добавьте товар в корзину, сохраните в избранное или сравните с другими моделями."
                      : "Add it to cart, save it, or compare it with other models."}
              </p>
              <div className="mt-5">
                <ProductActions
                  productId={mapped.id}
                  siteMode={siteMode}
                  productCategorySlug={mapped.category.slug}
                  context="product"
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
                    {locale === "uk"
                      ? "Ключові характеристики зібрані в одному місці."
                      : locale === "ru"
                        ? "Ключевые характеристики собраны в одном месте."
                        : "The most important specs are collected in one place."}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {specEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm"
                  >
                    <span className="capitalize text-[color:var(--color-text-soft)]">{key}</span>
                    <span className="font-medium text-[color:var(--color-text)]">{String(value)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
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
                  : locale === "uk"
                    ? "Поки без відгуків"
                    : locale === "ru"
                      ? "Пока без отзывов"
                      : "No reviews yet"}
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
                {locale === "uk"
                  ? "Для цього товару ще немає опублікованих відгуків."
                  : locale === "ru"
                    ? "Для этого товара пока нет опубликованных отзывов."
                    : "There are no published reviews for this product yet."}
              </div>
            )}
          </div>
        </div>
      </section>

      {recentlyViewed.length > 0 ? (
        <section className="mt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
                {locale === "uk" ? "Нещодавно переглянуті" : locale === "ru" ? "Недавно просмотренные" : "Recently Viewed"}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                {locale === "uk"
                  ? "Швидкий шлях назад до моделей, які вже привернули увагу."
                  : locale === "ru"
                    ? "Быстрый путь назад к моделям, которые уже привлекли внимание."
                    : "A quick way back to products that already caught attention."}
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
        <section className="mt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
                {locale === "uk" ? "Схожі товари" : locale === "ru" ? "Похожие товары" : "Similar products"}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                {locale === "uk"
                  ? "Схожі товари з тієї ж категорії, які легко порівняти між собою."
                  : locale === "ru"
                    ? "Похожие товары из той же категории, которые удобно сравнивать."
                    : "Similar products from the same category for fast comparison."}
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
        <section className="mt-12">
          <div className="mb-6">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
              {locale === "uk" ? "Розумний вибір" : locale === "ru" ? "Умный выбор" : "Smart picks"}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
              {locale === "uk"
                ? "Два короткі сценарії, якщо хочеться сильніший або більш зібраний варіант."
                : locale === "ru"
                  ? "Два коротких сценария, если хочется более сильный или более собранный вариант."
                  : "Two focused paths if you want either a stronger step-up or a smarter value pick."}
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {recommendations.betterVariant ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
                    {locale === "uk" ? "Кращий варіант" : locale === "ru" ? "Лучше вариант" : "Better variant"}
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                    {locale === "uk"
                      ? "М’який апгрейд у тому ж класі, коли хочеться більше запасу."
                      : locale === "ru"
                        ? "Мягкий апгрейд в том же классе, когда хочется больше запаса."
                        : "A gentle step-up in the same class when you want a bit more headroom."}
                  </p>
                </div>
                <ProductCard product={recommendations.betterVariant} locale={locale} siteMode={siteMode} />
              </div>
            ) : null}

            {recommendations.valueChoice ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
                    {locale === "uk" ? "Вигідний вибір" : locale === "ru" ? "Выгодный выбор" : "Great value"}
                  </h3>
                  <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                    {locale === "uk"
                      ? "Ближча до бюджету альтернатива з хорошим балансом ціни та класу."
                      : locale === "ru"
                        ? "Более бюджетная альтернатива с хорошим балансом цены и класса."
                        : "A tighter price point with a strong value-to-class balance."}
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
