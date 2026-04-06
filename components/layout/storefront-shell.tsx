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
  const facebookUrl = settings?.facebookUrl?.trim();
  const instagramUrl = settings?.instagramUrl?.trim();
  const youtubeUrl = settings?.youtubeUrl?.trim();
  const telegramUrl = settings?.telegramUrl?.trim();
  const supportPhoneTrimmed = settings?.supportPhone?.trim();

  const socials = [
    facebookUrl ? { label: "Facebook", href: facebookUrl } : null,
    instagramUrl ? { label: "Instagram", href: instagramUrl } : null,
    youtubeUrl ? { label: "YouTube", href: youtubeUrl } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;
  const whatsappHref = supportPhoneTrimmed ? buildWhatsAppHref(supportPhoneTrimmed) : null;
  const contactLinks = [
    telegramUrl ? { label: "Telegram", href: telegramUrl } : null,
    whatsappHref ? { label: "WhatsApp", href: whatsappHref } : null,
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
        supportEmail={settings?.supportEmail ?? ""}
        supportPhone={settings?.supportPhone ?? ""}
        address={settings?.address ?? ""}
        socials={socials}
        contactLinks={contactLinks}
      />
    </div>
  );
}
