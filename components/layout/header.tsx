import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";
import { MiniCart } from "@/components/layout/mini-cart";
import { NavLinks } from "@/components/layout/nav-links";
import { StorefrontLogo } from "@/components/layout/storefront-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getSiteExperienceCopy } from "@/lib/site-experience";
import { SITE_MODES, type SiteMode } from "@/lib/site-mode";

export async function Header({
  locale,
  cartCount,
  cartSubtotal,
  cartItems,
  wishlistCount,
  compareCount,
  brandName,
  logoPath,
  logoText,
  siteMode,
}: {
  locale: AppLocale;
  cartCount: number;
  cartSubtotal: number;
  cartItems: Array<{
    id: string;
    slug: string;
    name: string;
    heroImage: string;
    quantity: number;
    price: number;
    currency: string;
  }>;
  wishlistCount: number;
  compareCount: number;
  brandName: string;
  logoPath?: string | null;
  logoText?: string | null;
  siteMode: SiteMode;
}) {
  const t = await getTranslations({ locale });
  const experience = getSiteExperienceCopy(locale, siteMode);
  const catalogLabel =
    siteMode === SITE_MODES.pcBuild ? experience?.navCatalog ?? t("navCatalog") : t("navCatalog");
  const configuratorLabel =
    siteMode === SITE_MODES.pcBuild ? experience?.navConfigurator ?? "PC Configurator" : "PC Configurator";

  const navItems = [
    { href: "/", label: t("navHome") },
    { href: "/catalog", label: catalogLabel },
    {
      href: "/configurator",
      label: configuratorLabel,
      accent: true,
    },
    { href: "/wishlist", label: wishlistCount > 0 ? `${t("navWishlist")} (${wishlistCount})` : t("navWishlist") },
    { href: "/compare", label: compareCount > 0 ? `${t("navCompare")} (${compareCount})` : t("navCompare") },
  ];

  return (
    <header className="sticky top-0 z-[70] px-3 pt-3 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <div className="storefront-shell mx-auto rounded-[1.75rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] shadow-[var(--shadow-soft)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 lg:px-6 xl:px-7">
          <Link href="/" className="group flex min-w-0 shrink-0 items-center self-center">
            <StorefrontLogo brandName={brandName} logoPath={logoPath} logoText={logoText} />
          </Link>
          <nav className="hidden min-w-0 items-center gap-2 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-1 lg:flex">
            <NavLinks items={navItems} />
          </nav>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <MiniCart itemCount={cartCount} subtotal={cartSubtotal} items={cartItems} />
            <NavLinks items={[{ href: "/account", label: t("navAccount") }]} variant="account" />
            <ThemeToggle />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-4 lg:hidden sm:px-5 lg:px-6 xl:px-7">
          <NavLinks items={navItems} mobile />
        </div>
      </div>
    </header>
  );
}
