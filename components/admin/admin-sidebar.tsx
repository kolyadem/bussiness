"use client";

import {
  CircleDollarSign,
  FolderTree,
  Image as ImageIcon,
  LayoutGrid,
  Package,
  PackageCheck,
  ReceiptText,
  Settings,
  Shapes,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { getAdminCapabilities } from "@/lib/admin/permissions";
import { Link } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

const icons = {
  dashboard: LayoutGrid,
  products: Package,
  brands: Shapes,
  categories: FolderTree,
  banners: ImageIcon,
  orders: PackageCheck,
  imports: Workflow,
  priceUpdates: CircleDollarSign,
  requests: ReceiptText,
  settings: SlidersHorizontal,
  account: Settings,
  users: ShieldCheck,
} as const;

function sidebarText(
  locale: string,
  copy: {
    uk: string;
    ru: string;
    en: string;
  },
) {
  return copy[locale as "uk" | "ru" | "en"] ?? copy.en;
}

export function AdminSidebar({
  locale,
  role,
  canAccessPriceUpdates = false,
}: {
  locale: string;
  role: string;
  canAccessPriceUpdates?: boolean;
}) {
  const pathname = usePathname();
  const capabilities = getAdminCapabilities(role, { canAccessPriceUpdates });
  const items = [
    {
      href: "/admin",
      key: "dashboard",
      label: sidebarText(locale, {
        uk: "Робоча панель",
        ru: "Рабочая панель",
        en: "Dashboard",
      }),
    },
    {
      href: "/admin/products",
      key: "products",
      label: sidebarText(locale, {
        uk: "Товари",
        ru: "Товары",
        en: "Products",
      }),
    },
    capabilities.canManageCatalogTaxonomy
      ? {
          href: "/admin/brands",
          key: "brands",
          label: sidebarText(locale, {
            uk: "Бренди",
            ru: "Бренды",
            en: "Brands",
          }),
        }
      : null,
    capabilities.canManageCatalogTaxonomy
      ? {
          href: "/admin/categories",
          key: "categories",
          label: sidebarText(locale, {
            uk: "Категорії",
            ru: "Категории",
            en: "Categories",
          }),
        }
      : null,
    capabilities.canManageBanners
      ? {
          href: "/admin/banners",
          key: "banners",
          label: sidebarText(locale, {
            uk: "Банери",
            ru: "Баннеры",
            en: "Banners",
          }),
        }
      : null,
    {
      href: "/admin/orders",
      key: "orders",
      label: sidebarText(locale, {
        uk: "Замовлення",
        ru: "Заказы",
        en: "Orders",
      }),
    },
    capabilities.canManageImports
      ? {
          href: "/admin/imports",
          key: "imports",
          label: sidebarText(locale, {
            uk: "Імпорт",
            ru: "Импорт",
            en: "Imports",
          }),
        }
      : null,
    capabilities.canManagePriceUpdates
      ? {
          href: "/admin/price-updates",
          key: "priceUpdates",
          label: sidebarText(locale, {
            uk: "Оновлення цін",
            ru: "Обновление цен",
            en: "Price updates",
          }),
        }
      : null,
    {
      href: "/admin/build-requests",
      key: "requests",
      label: sidebarText(locale, {
        uk: "Заявки",
        ru: "Заявки",
        en: "Requests",
      }),
    },
    capabilities.canManageSettings
      ? {
          href: "/admin/settings",
          key: "settings",
          label: sidebarText(locale, {
            uk: "Сайт",
            ru: "Сайт",
            en: "Site",
          }),
        }
      : null,
    capabilities.canManageUsers
      ? {
          href: "/admin/users",
          key: "users",
          label: sidebarText(locale, {
            uk: "Користувачі та ролі",
            ru: "Пользователи и роли",
            en: "Users and roles",
          }),
        }
      : null,
    {
      href: "/admin/account",
      key: "account",
      label: sidebarText(locale, {
        uk: "Акаунт",
        ru: "Аккаунт",
        en: "Account",
      }),
    },
  ].filter(Boolean) as Array<{
    href: string;
    key: keyof typeof icons;
    label: string;
  }>;

  return (
    <nav className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="grid gap-2">
        {items.map((item) => {
          const Icon = icons[item.key];
          const localizedHref = `/${locale}${item.href}`;
          const isActive = pathname === localizedHref || pathname.startsWith(`${localizedHref}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[1.2rem] px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-text)] shadow-[0_14px_28px_rgba(24,184,255,0.12)]"
                  : "border border-transparent text-[color:var(--color-text-soft)] hover:border-[color:var(--color-line-strong)] hover:bg-[color:var(--color-surface-elevated)] hover:text-[color:var(--color-text)]",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
