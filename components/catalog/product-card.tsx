import type { AppLocale } from "@/lib/constants";
import { Link } from "@/lib/i18n/routing";
import { calculateUnitFinancials } from "@/lib/commerce/finance";
import { SITE_MODES, type SiteMode } from "@/lib/site-mode";
import { formatPrice } from "@/lib/utils";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import { ProductActions } from "@/components/product/product-actions";
import { ArrowUpRight, Star } from "lucide-react";

type SmartBadge = "POPULAR" | "VALUE" | "BEST_CHOICE";

function getBadgeLabel(badge: SmartBadge, locale: AppLocale) {
  switch (badge) {
    case "POPULAR":
      return locale === "uk" ? "Популярно" : locale === "ru" ? "Популярно" : "Popular";
    case "VALUE":
      return locale === "uk" ? "Вигідно" : locale === "ru" ? "Выгодно" : "Great value";
    case "BEST_CHOICE":
      return locale === "uk" ? "Кращий вибір" : locale === "ru" ? "Лучший выбор" : "Best choice";
  }
}

function getBadgeTone(badge: SmartBadge) {
  switch (badge) {
    case "POPULAR":
      return "border border-amber-400/20 bg-amber-400/12 text-amber-600";
    case "VALUE":
      return "border border-emerald-400/20 bg-emerald-400/12 text-emerald-600";
    case "BEST_CHOICE":
      return "border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-text)]";
  }
}

function resolveFallbackBadge(product: {
  oldPrice: number | null;
  purchasePrice?: number | null;
  price: number;
  rating: number;
}) {
  const financials = calculateUnitFinancials({
    price: product.price,
    purchasePrice: product.purchasePrice ?? null,
  });

  if (product.rating >= 4.7) {
    return "POPULAR" as const;
  }

  if (financials.marginPercent !== null && financials.marginPercent >= 30) {
    return "BEST_CHOICE" as const;
  }

  if (product.oldPrice !== null || (financials.marginPercent !== null && financials.marginPercent >= 18)) {
    return "VALUE" as const;
  }

  return null;
}

export function ProductCard({
  product,
  locale,
  showActions = true,
  footer,
  siteMode = SITE_MODES.store,
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    shortDescription: string;
    heroImage: string;
    price: number;
    purchasePrice?: number | null;
    oldPrice: number | null;
    currency: string;
    inventoryLabel: string;
    inventoryStatus?: string;
    rating: number;
    conversionBadge?: SmartBadge | null;
    brand: { name: string };
    category?: { name: string; slug?: string };
  };
  locale: AppLocale;
  showActions?: boolean;
  footer?: React.ReactNode;
  siteMode?: SiteMode;
}) {
  const labels = {
    price:
      locale === "uk" ? "Ціна" : locale === "ru" ? "Цена" : "Price",
  };
  const oldPrice = typeof product.oldPrice === "number" ? product.oldPrice : null;
  const hasDiscount = oldPrice !== null && oldPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((oldPrice - product.price) / oldPrice) * 100)
    : null;
  const resolvedBadge = product.conversionBadge ?? resolveFallbackBadge(product);
  const inventoryTone =
    product.inventoryStatus === "OUT_OF_STOCK"
      ? "border border-rose-500/18 bg-rose-500/10 text-rose-500 dark:text-rose-300"
      : product.inventoryStatus === "LOW_STOCK"
        ? "border border-amber-400/18 bg-amber-400/10 text-amber-500 dark:text-amber-200"
        : "border border-emerald-400/18 bg-emerald-400/10 text-emerald-600 dark:text-emerald-200";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-3 shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-1.5 hover:border-[color:var(--color-accent-line)] hover:shadow-[var(--shadow-strong)] sm:p-4">
      <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-[color:var(--color-accent-soft)] opacity-0 blur-3xl transition duration-500 group-hover:opacity-100" />
      <div className="relative flex items-center justify-between gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
            {product.brand.name}
          </span>
          {resolvedBadge ? (
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getBadgeTone(resolvedBadge)}`}>
              {getBadgeLabel(resolvedBadge, locale)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {product.rating > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] px-3 py-1 text-xs font-medium text-[color:var(--color-text)]">
              <Star className="h-3.5 w-3.5 fill-current text-[color:var(--color-accent-strong)]" />
              {product.rating.toFixed(1)}
            </span>
          ) : null}
          {discountPercent ? (
            <span className="rounded-full bg-[linear-gradient(135deg,var(--color-accent)_0%,var(--color-accent-strong)_100%)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-accent-contrast)] shadow-[var(--shadow-soft)]">
              -{discountPercent}%
            </span>
          ) : null}
        </div>
      </div>

      <Link href={`/product/${product.slug}`} className="relative block overflow-hidden rounded-[1.7rem]">
        <ProductImageFrame src={product.heroImage} alt={product.name} className="rounded-[1.7rem] border-[color:var(--color-line)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-[linear-gradient(180deg,transparent_0%,var(--color-overlay-strong)_100%)] px-4 py-4 opacity-95">
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${inventoryTone}`}>
            {product.inventoryLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--color-text-soft)] transition duration-300 group-hover:text-[color:var(--color-accent-strong)]">
            {locale === "uk" ? "Переглянути" : locale === "ru" ? "Смотреть" : "View"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>

      <div className="relative mt-4 flex flex-1 flex-col gap-4">
        <div className="space-y-2">
          {product.category ? (
            <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-accent-strong)]">
              {product.category.name}
            </p>
          ) : null}
          <Link
            href={`/product/${product.slug}`}
            className="line-clamp-2 font-heading text-xl font-semibold leading-tight tracking-[-0.03em] text-[color:var(--color-text)] transition hover:text-[color:var(--color-accent-strong)]"
          >
            {product.name}
          </Link>
          <p className="line-clamp-2 text-sm leading-6 text-[color:var(--color-text-soft)]">
            {product.shortDescription}
          </p>
        </div>

        <div className="rounded-[1.45rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] px-4 py-4 backdrop-blur-xl">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--color-text-soft)]">
                {labels.price}
              </p>
              <p className="mt-1 font-heading text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
                {formatPrice(product.price, locale, product.currency)}
              </p>
            </div>
            {oldPrice ? (
              <div className="text-right">
                <p className="text-sm text-[color:var(--color-text-soft)] line-through">
                  {formatPrice(oldPrice, locale, product.currency)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[color:var(--color-accent-strong)]">
                  {locale === "uk" ? "Вигідна ціна" : locale === "ru" ? "Выгодная цена" : "Special offer"}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-auto space-y-3">
          {showActions ? (
            <ProductActions
              productId={product.id}
              compact
              siteMode={siteMode}
              productCategorySlug={product.category?.slug ?? null}
              context="catalog"
            />
          ) : null}
          {footer}
        </div>
      </div>
    </article>
  );
}
