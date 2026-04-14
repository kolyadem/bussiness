import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  ClipboardList,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
  Workflow,
} from "lucide-react";
import type { AppLocale } from "@/lib/constants";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  canViewAdminFinancials,
  getAdminCapabilities,
  getAdminDashboardData,
  getAdminDashboardImportHealth,
  pickAdminTranslation,
  requireAdminAccess,
} from "@/lib/admin";
import { inventoryLabels } from "@/lib/constants";
import { Link } from "@/lib/i18n/routing";
import {
  getOrderKindLabel,
  getOrderKindTone,
  getOrderNumber,
  getOrderStatusLabel,
  getOrderStatusTone,
} from "@/lib/storefront/orders";
import { formatPrice, STOREFRONT_CURRENCY_CODE } from "@/lib/utils";

const AdminDashboardTrends = dynamic(
  () => import("@/components/admin/admin-dashboard-trends").then((mod) => mod.AdminDashboardTrends),
  {
    loading: () => (
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="h-7 w-64 rounded-full bg-[color:var(--color-surface-elevated)]" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-[color:var(--color-surface-elevated)]" />
        <div className="mt-6 h-[320px] rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)]" />
      </section>
    ),
  },
);

function getCopy(isOwner: boolean) {
  return {
    title: isOwner ? "Панель власника" : "Операційний огляд",
    subtitle: isOwner
      ? "Ключові гроші, замовлення, товарні сигнали та останні події магазину в одному чистому owner-view."
      : "Безпечний operational-зріз для менеджера: замовлення, статуси, товари й сигнали по залишках.",
    orders: "Усього замовлень",
    newOrders: "Нові замовлення",
    revenue: "Виручка",
    grossProfit: "Валовий прибуток",
    averageOrderValue: "Середній чек",
    inStock: "У наявності",
    lowStock: "Мало залишку",
    buildRequests: "Заявки на збірку",
    trendsTitle: "Динаміка виручки та прибутку",
    trendsSubtitle: "Денні, тижневі та місячні зрізи без важкого BI-шуму.",
    day: "Дні",
    week: "Тижні",
    month: "Місяці",
    statuses: "Статуси замовлень",
    statusesSubtitle: "Швидко видно, де саме зараз навантаження магазину.",
    recentOrders: "Останні замовлення",
    recentOrdersSubtitle: "Живий потік нових і оновлених замовлень.",
    topSelling: "Топ продажів",
    topSellingSubtitle: "Що найчастіше рухає замовлення.",
    topProfitable: "Топ по прибутку",
    topProfitableSubtitle: "Позиції, що реально формують gross profit.",
    lowStockTitle: "Слабкі залишки",
    lowStockSubtitle: "Товари, які скоро випадуть із продажу або вже на межі.",
    ownerTools: "Інструменти власника",
    managerTools: "Робочі розділи",
    users: "Користувачі та ролі",
    usersText:
      "Видача менеджерського доступу та контроль ролей без ризику для owner-account.",
    ordersLink: "Відкрити замовлення",
    productsLink: "Каталог товарів",
    importsLink: "Центр імпорту",
    emptyList: "Поки нічого показати.",
    qty: "шт.",
    items: "позицій",
    city: "Місто",
    incompleteProfit:
      "Частина замовлень ще без повного cost-basis, тому profit показує лише доступну базу.",
    importHealth: "Стан імпортів",
    activeAlerts: "Активні сповіщення",
    attentionSources: "Проблемні джерела",
    syncingNow: "Зараз синхронізуються",
  };
}

function getStatusBarWidth(count: number, maxCount: number) {
  if (maxCount <= 0 || count <= 0) {
    return "0%";
  }

  return `${Math.max(10, Math.round((count / maxCount) * 100))}%`;
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const viewer = await requireAdminAccess(locale);
  const capabilities = getAdminCapabilities(viewer.role, {
    canAccessPriceUpdates: viewer.canAccessPriceUpdates,
  });
  const canSeeFinancials = canViewAdminFinancials(viewer.role);
  const [dashboard, importHealth] = await Promise.all([
    getAdminDashboardData({ locale, viewerRole: viewer.role }),
    capabilities.canManageImports ? getAdminDashboardImportHealth() : Promise.resolve(null),
  ]);
  const copy = getCopy(canSeeFinancials);
  const maxStatusCount = Math.max(...dashboard.statusCounts.map((item) => item.count), 0);

  const kpis = [
    { label: copy.orders, value: String(dashboard.totals.orders), icon: ClipboardList },
    { label: copy.newOrders, value: String(dashboard.totals.newOrders), icon: PackageCheck },
    ...(canSeeFinancials
      ? [
          {
            label: copy.revenue,
            value: formatPrice(dashboard.totals.revenue ?? 0, locale, STOREFRONT_CURRENCY_CODE),
            icon: Banknote,
          },
          {
            label: copy.grossProfit,
            value: formatPrice(dashboard.totals.grossProfit ?? 0, locale, STOREFRONT_CURRENCY_CODE),
            icon: TrendingUp,
          },
          {
            label: copy.averageOrderValue,
            value: formatPrice(dashboard.totals.averageOrderValue ?? 0, locale, STOREFRONT_CURRENCY_CODE),
            icon: ArrowRight,
          },
        ]
      : [
          {
            label: copy.buildRequests,
            value: String(dashboard.totals.buildRequests),
            icon: Workflow,
          },
        ]),
    { label: copy.inStock, value: String(dashboard.totals.inStockProducts), icon: Boxes },
    { label: copy.lowStock, value: String(dashboard.totals.lowStockProducts), icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.subtitle}</p>
          </div>
          <div className="rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-4 py-2 text-sm font-medium text-[color:var(--color-text)]">
            {viewer.name ?? viewer.email ?? viewer.login}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/admin/orders">
            <Button variant="secondary" className="h-9 px-3 text-xs">
              {copy.ordersLink}
            </Button>
          </Link>
          <Link href="/admin/products">
            <Button variant="secondary" className="h-9 px-3 text-xs">
              {copy.productsLink}
            </Button>
          </Link>
          {capabilities.canManageImports ? (
            <Link href="/admin/imports">
              <Button variant="secondary" className="h-9 px-3 text-xs">
                {copy.importsLink}
              </Button>
            </Link>
          ) : null}
          {capabilities.canManagePriceUpdates ? (
            <Link href="/admin/price-updates">
              <Button variant="secondary" className="h-9 px-3 text-xs">
                Оновлення цін
              </Button>
            </Link>
          ) : null}
          <Link href="/admin/build-requests">
            <Button variant="secondary" className="h-9 px-3 text-xs">
              {copy.buildRequests}
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        {kpis.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.label}
              className="rounded-[1.7rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{item.label}</p>
                <Icon className="h-4 w-4 text-[color:var(--color-accent-strong)]" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)] xl:text-3xl">
                {item.value}
              </p>
            </article>
          );
        })}
      </section>

      {canSeeFinancials && dashboard.trends ? (
        <AdminDashboardTrends
          locale={locale}
          title={copy.trendsTitle}
          subtitle={copy.trendsSubtitle}
          labels={{
            day: copy.day,
            week: copy.week,
            month: copy.month,
            revenue: copy.revenue,
            profit: copy.grossProfit,
          }}
          datasets={dashboard.trends}
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <article className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {copy.statuses}
          </h3>
          <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.statusesSubtitle}</p>
          <div className="mt-6 grid gap-4">
            {dashboard.statusCounts.map((item) => (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[color:var(--color-text)]">
                    {getOrderStatusLabel(item.status, locale)}
                  </span>
                  <span className="text-[color:var(--color-text-soft)]">{item.count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-[color:var(--color-surface-elevated)]">
                  <div
                    className={`h-full rounded-full ${getOrderStatusTone(item.status).includes("rose") ? "bg-rose-500/70" : getOrderStatusTone(item.status).includes("emerald") ? "bg-emerald-500/70" : getOrderStatusTone(item.status).includes("violet") ? "bg-violet-500/70" : getOrderStatusTone(item.status).includes("amber") ? "bg-amber-400/70" : getOrderStatusTone(item.status).includes("cyan") ? "bg-cyan-500/70" : "bg-sky-500/70"}`}
                    style={{ width: getStatusBarWidth(item.count, maxStatusCount) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {copy.recentOrders}
          </h3>
          <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.recentOrdersSubtitle}</p>
          <div className="mt-6 grid gap-3">
            {dashboard.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 transition hover:border-[color:var(--color-accent-line)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[color:var(--color-text)]">
                    {getOrderNumber(order.id)}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${getOrderStatusTone(order.status)}`}>
                    {getOrderStatusLabel(order.status, locale)}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${getOrderKindTone(order.orderKind)}`}>
                    {getOrderKindLabel(order.orderKind, locale)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[color:var(--color-text)]">{order.customerName}</p>
                    <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                      {copy.city}: {order.deliveryCity ?? "—"} • {order.itemsCount} {copy.items}
                    </p>
                  </div>
                  {canSeeFinancials && typeof order.totalPrice === "number" ? (
                    <p className="text-lg font-semibold text-[color:var(--color-text)]">
                      {formatPrice(order.totalPrice, locale, order.currency)}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {copy.topSelling}
          </h3>
          <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.topSellingSubtitle}</p>
          <div className="mt-6 grid gap-3">
            {dashboard.topSellingProducts.length === 0 ? (
              <p className="text-sm text-[color:var(--color-text-soft)]">{copy.emptyList}</p>
            ) : (
              dashboard.topSellingProducts.map((product) => (
                <div
                  key={product.key}
                  className="rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[color:var(--color-text)]">{product.name}</p>
                      <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                        {product.quantity} {copy.qty}
                      </p>
                    </div>
                    {canSeeFinancials ? (
                      <p className="text-sm font-medium text-[color:var(--color-text)]">
                        {formatPrice(product.revenue, locale, STOREFRONT_CURRENCY_CODE)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        {canSeeFinancials ? (
          <article className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
              {copy.topProfitable}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.topProfitableSubtitle}</p>
            <div className="mt-6 grid gap-3">
              {dashboard.topProfitableProducts?.length ? (
                dashboard.topProfitableProducts.map((product) => (
                  <div
                    key={product.key}
                    className="rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[color:var(--color-text)]">{product.name}</p>
                        <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                          {product.quantity} {copy.qty}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-[color:var(--color-text)]">
                        {formatPrice(product.grossProfit ?? 0, locale, STOREFRONT_CURRENCY_CODE)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.emptyList}</p>
              )}
            </div>
            {!dashboard.totals.grossProfitComplete ? (
              <p className="mt-4 text-xs leading-6 text-[color:var(--color-text-soft)]">{copy.incompleteProfit}</p>
            ) : null}
          </article>
        ) : null}

        <article className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {copy.lowStockTitle}
          </h3>
          <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.lowStockSubtitle}</p>
          <div className="mt-6 grid gap-3">
            {dashboard.lowStockProducts.length === 0 ? (
              <p className="text-sm text-[color:var(--color-text-soft)]">{copy.emptyList}</p>
            ) : (
              dashboard.lowStockProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}/edit`}
                  className="rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 transition hover:border-[color:var(--color-accent-line)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[color:var(--color-text)]">
                        {pickAdminTranslation(product.translations, locale).name}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                        {inventoryLabels[product.inventoryStatus as keyof typeof inventoryLabels] ?? product.inventoryStatus} • {product.stock}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[color:var(--color-text-soft)]" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {capabilities.canManageUsers || capabilities.canManageImports ? (
          <article className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
              {canSeeFinancials ? copy.ownerTools : copy.managerTools}
            </h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {capabilities.canManageUsers ? (
                <Link
                  href="/admin/users"
                  className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-5 transition hover:border-[color:var(--color-accent-line)]"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[color:var(--color-accent-strong)]" />
                    <h4 className="text-lg font-semibold text-[color:var(--color-text)]">{copy.users}</h4>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.usersText}</p>
                </Link>
              ) : null}
              {capabilities.canManageImports ? (
                <Link
                  href="/admin/imports"
                  className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-5 transition hover:border-[color:var(--color-accent-line)]"
                >
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-[color:var(--color-accent-strong)]" />
                    <h4 className="text-lg font-semibold text-[color:var(--color-text)]">{copy.importsLink}</h4>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">
                    {copy.importHealth}
                  </p>
                </Link>
              ) : null}
            </div>
          </article>
        ) : (
          <div />
        )}

        {importHealth ? (
          <aside className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
              {copy.importHealth}
            </h3>
            <div className="mt-6 grid gap-3">
              <div className="rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.activeAlerts}</p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--color-text)]">
                  {importHealth.activeAlertsCount}
                </p>
              </div>
              <div className="rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.attentionSources}</p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--color-text)]">
                  {importHealth.affectedSourcesCount}
                </p>
              </div>
              <div className="rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.syncingNow}</p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--color-text)]">
                  {importHealth.syncingSourcesCount}
                </p>
              </div>
            </div>
          </aside>
        ) : null}
      </section>
    </div>
  );
}
