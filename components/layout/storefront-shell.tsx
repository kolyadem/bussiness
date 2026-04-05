import { PageViewTracker } from "@/components/observability/page-view-tracker";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { buildWhatsAppHref } from "@/lib/contact";
import type { AppLocale } from "@/lib/constants";
import { getSiteMode } from "@/lib/site-config";
import {
  getCart,
  getCompareItems,
  getSiteSettings,
  getWishlistItems,
  mapProduct,
} from "@/lib/storefront/queries";

export async function StorefrontShell({
  locale,
  children,
}: {
  locale: AppLocale;
  children: React.ReactNode;
}) {
  const [settings, siteMode, cart, wishlist, compare] = await Promise.all([
    getSiteSettings(),
    getSiteMode(),
    getCart(),
    getWishlistItems(),
    getCompareItems(),
  ]);

  const brandName = settings?.brandName ?? "Lumina Tech";
  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const cartSubtotal =
    cart?.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0) ?? 0;
  const cartItems =
    cart?.items.slice(0, 3).map((item) => {
      const product = mapProduct(item.product, locale);

      return {
        id: item.id,
        slug: product.slug,
        name: product.name,
        heroImage: product.heroImage,
        quantity: item.quantity,
        price: product.price,
        currency: product.currency,
      };
    }) ?? [];
  const socials = [
    settings?.facebookUrl ? { label: "Facebook", href: settings.facebookUrl } : null,
    settings?.instagramUrl ? { label: "Instagram", href: settings.instagramUrl } : null,
    settings?.youtubeUrl ? { label: "YouTube", href: settings.youtubeUrl } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;
  const contactLinks = [
    settings?.telegramUrl ? { label: "Telegram", href: settings.telegramUrl } : null,
    settings?.supportPhone
      ? { label: "WhatsApp", href: buildWhatsAppHref(settings.supportPhone) }
      : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item?.href));

  return (
    <div className="min-h-screen bg-transparent text-[color:var(--color-text)]">
      <PageViewTracker locale={locale} />
      <Header
        locale={locale}
        cartCount={cartCount}
        cartSubtotal={cartSubtotal}
        cartItems={cartItems}
        wishlistCount={wishlist.length}
        compareCount={compare.length}
        brandName={brandName}
        logoPath={settings?.logoPath}
        logoText={settings?.logoText}
        siteMode={siteMode}
      />
      <div className="relative">{children}</div>
      <Footer
        locale={locale}
        brandName={brandName}
        supportEmail={settings?.supportEmail ?? "hello@luminatech.store"}
        supportPhone={settings?.supportPhone ?? ""}
        address={settings?.address ?? "Kyiv"}
        socials={socials}
        contactLinks={contactLinks}
      />
    </div>
  );
}
