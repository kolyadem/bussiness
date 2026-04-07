"use client";

import {
  Banknote,
  FolderTree,
  Image as ImageIcon,
  LayoutGrid,
  Package,
  PackageCheck,
  ReceiptText,
  Settings,
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
  categories: FolderTree,
  banners: ImageIcon,
  orders: PackageCheck,
  imports: Workflow,
  priceUpdates: Banknote,
  requests: ReceiptText,
  settings: SlidersHorizontal,
  account: Settings,
  users: ShieldCheck,
} as const;

export function AdminSidebar({
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
      label: "Робоча панель",
    },
    {
      href: "/admin/products",
      key: "products",
      label: "Товари",
    },
    capabilities.canManageCatalogTaxonomy
      ? {
          href: "/admin/categories",
          key: "categories",
          label: "Категорії",
        }
      : null,
    capabilities.canManageBanners
      ? {
          href: "/admin/banners",
          key: "banners",
          label: "Банери",
        }
      : null,
    {
      href: "/admin/orders",
      key: "orders",
      label: "Замовлення",
    },
    capabilities.canManageImports
      ? {
          href: "/admin/imports",
          key: "imports",
          label: "Імпорт",
        }
      : null,
    capabilities.canManagePriceUpdates
      ? {
          href: "/admin/price-updates",
          key: "priceUpdates",
          label: "Оновлення цін",
        }
      : null,
    {
      href: "/admin/build-requests",
      key: "requests",
      label: "Заявки",
    },
    capabilities.canManageSettings
      ? {
          href: "/admin/settings",
          key: "settings",
          label: "Сайт",
        }
      : null,
    capabilities.canManageUsers
      ? {
          href: "/admin/users",
          key: "users",
          label: "Користувачі та ролі",
        }
      : null,
    {
      href: "/admin/account",
      key: "account",
      label: "Акаунт",
    },
  ].filter(Boolean) as Array<{
    href: string;
    key: keyof typeof icons;
    label: string;
  }>;

  return (
    <nav
      aria-label="Адмін-меню"
      className="rounded-[1.4rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-2 shadow-[var(--shadow-soft)]"
    >
      <div className="grid gap-1">
        {items.map((item) => {
          const Icon = icons[item.key];
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-[1rem] px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-text)] shadow-[0_14px_28px_rgba(24,184,255,0.12)]"
                  : "border border-transparent text-[color:var(--color-text-soft)] hover:border-[color:var(--color-line-strong)] hover:bg-[color:var(--color-surface-elevated)] hover:text-[color:var(--color-text)]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" />
              <span className="leading-snug">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
