import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardList,
  DollarSign,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { AdminDashboardTrends } from "@/components/admin/admin-dashboard-trends";
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
import { formatPrice } from "@/lib/utils";

function getCopy(locale: "uk" | "ru" | "en", isOwner: boolean) {
  return {
    title: isOwner
      ? locale === "uk"
        ? "Панель власника"
        : locale === "ru"
          ? "Панель владельца"
          : "Owner dashboard"
      : locale === "uk"
        ? "Операційний огляд"
        : locale === "ru"
          ? "Операционный обзор"
          : "Operations overview",
    subtitle: isOwner
      ? locale === "uk"
        ? "Ключові гроші, замовлення, товарні сигнали та останні події магазину в одному чистому owner-view."
        : locale === "ru"
          ? "Ключевые деньги, заказы, товарные сигналы и последние события магазина в одном чистом owner-view."
          : "Core money metrics, orders, product signals, and recent store activity in one owner-facing view."
      : locale === "uk"
        ? "Безпечний operational-зріз для менеджера: замовлення, статуси, товари й сигнали по залишках."
        : locale === "ru"
          ? "Безопасный operational-срез для менеджера: заказы, статусы, товары и сигналы по остаткам."
          : "A safe operational view for managers with orders, statuses, products, and stock signals.",
    orders: locale === "uk" ? "Усього замовлень" : locale === "ru" ? "Всего заказов" : "Total orders",
    newOrders: locale === "uk" ? "Нові замовлення" : locale === "ru" ? "Новые заказы" : "New orders",
    revenue: locale === "uk" ? "Виручка" : locale === "ru" ? "Выручка" : "Revenue",
    grossProfit: locale === "uk" ? "Валовий прибуток" : locale === "ru" ? "Валовая прибыль" : "Gross profit",
    averageOrderValue: locale === "uk" ? "Середній чек" : locale === "ru" ? "Средний чек" : "Average order value",
    inStock: locale === "uk" ? "У наявності" : locale === "ru" ? "В наличии" : "In stock",
    lowStock: locale === "uk" ? "Мало залишку" : locale === "ru" ? "Мало остатков" : "Low stock",
    buildRequests: locale === "uk" ? "Заявки на збірку" : locale === "ru" ? "Заявки на сборку" : "Build requests",
    trendsTitle: locale === "uk" ? "Динаміка виручки та прибутку" : locale === "ru" ? "Динамика выручки и прибыли" : "Revenue and profit trends",
    trendsSubtitle: locale === "uk"
      ? "Денні, тижневі та місячні зрізи без важкого BI-шуму."
      : locale === "ru"
        ? "Дневные, недельные и месячные срезы без тяжёлого BI-шума."
        : "Daily, weekly, and monthly cuts without heavy BI clutter.",
    day: locale === "uk" ? "Дні" : locale === "ru" ? "Дни" : "Days",
    week: locale === "uk" ? "Тижні" : locale === "ru" ? "Недели" : "Weeks",
    month: locale === "uk" ? "Місяці" : locale === "ru" ? "Месяцы" : "Months",
    statuses: locale === "uk" ? "Статуси замовлень" : locale === "ru" ? "Статусы заказов" : "Order statuses",
    statusesSubtitle: locale === "uk"
      ? "Швидко видно, де саме зараз навантаження магазину."
      : locale === "ru"
        ? "Быстро видно, где именно сейчас нагрузка магазина."
        : "A quick look at where the store workload sits right now.",
    recentOrders: locale === "uk" ? "Останні замовлення" : locale === "ru" ? "Последние заказы" : "Recent orders",
    recentOrdersSubtitle: locale === "uk"
      ? "Живий потік нових і оновлених замовлень."
      : locale === "ru"
        ? "Живой поток новых и обновлённых заказов."
        : "A live feed of newly placed and recently updated orders.",
    topSelling: locale === "uk" ? "Топ продажів" : locale === "ru" ? "Топ продаж" : "Top selling products",
    topSellingSubtitle: locale === "uk"
      ? "Що найчастіше рухає замовлення."
      : locale === "ru"
        ? "Что чаще всего двигает заказы."
        : "What moves the most orders.",
    topProfitable: locale === "uk" ? "Топ по прибутку" : locale === "ru" ? "Топ по прибыли" : "Top profitable products",
    topProfitableSubtitle: locale === "uk"
      ? "Позиції, що реально формують gross profit."
      : locale === "ru"
        ? "Позиции, которые реально формируют gross profit."
        : "Products that contribute the most gross profit.",
    lowStockTitle: locale === "uk" ? "Слабкі залишки" : locale === "ru" ? "Слабые остатки" : "Low stock alerts",
    lowStockSubtitle: locale === "uk"
      ? "Товари, які скоро випадуть із продажу або вже на межі."
      : locale === "ru"
        ? "Товары, которые скоро выпадут из продажи или уже на грани."
        : "Products that are near sell-out or already at risk.",
    ownerTools: locale === "uk" ? "Інструменти власника" : locale === "ru" ? "Инструменты владельца" : "Owner tools",
    managerTools: locale === "uk" ? "Робочі розділи" : locale === "ru" ? "Рабочие разделы" : "Operational sections",
    users: locale === "uk" ? "Користувачі та ролі" : locale === "ru" ? "Пользователи и роли" : "Users and roles",
    usersText: locale === "uk"
      ? "Видача менеджерського доступу та контроль ролей без ризику для owner-account."
      : locale === "ru"
        ? "Выдача менеджерского доступа и контроль ролей без риска для owner-account."
        : "Grant manager access and control roles without risking the owner account.",
    ordersLink: locale === "uk" ? "Відкрити замовлення" : locale === "ru" ? "Открыть заказы" : "Open orders",
    productsLink: locale === "uk" ? "Каталог товарів" : locale === "ru" ? "Каталог товаров" : "Product catalog",
    importsLink: locale === "uk" ? "Центр імпорту" : locale === "ru" ? "Центр импорта" : "Import Center",
    emptyList: locale === "uk" ? "Поки нічого показати." : locale === "ru" ? "Пока нечего показать." : "Nothing to show yet.",
    qty: locale === "uk" ? "шт." : locale === "ru" ? "шт." : "pcs",
    items: locale === "uk" ? "позицій" : locale === "ru" ? "позиций" : "items",
    city: locale === "uk" ? "Місто" : locale === "ru" ? "Город" : "City",
    incompleteProfit: locale === "uk"
      ? "Частина замовлень ще без повного cost-basis, тому profit показує лише доступну базу."
      : locale === "ru"
        ? "Часть заказов ещё без полного cost-basis, поэтому profit показывает только доступную базу."
        : "Some orders still have incomplete cost basis, so profit reflects only the known portion.",
    importHealth: locale === "uk" ? "Стан імпортів" : locale === "ru" ? "Состояние импортов" : "Import health",
    activeAlerts: locale === "uk" ? "Активні сповіщення" : locale === "ru" ? "Активные уведомления" : "Active alerts",
    attentionSources: locale === "uk" ? "Проблемні джерела" : locale === "ru" ? "Проблемные источники" : "Sources needing attention",
    syncingNow: locale === "uk" ? "Зараз синхронізуються" : locale === "ru" ? "Сейчас синхронизируются" : "Syncing now",
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
  params: Promise<{ locale: "uk" | "ru" | "en" }>;
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
  const copy = getCopy(locale, canSeeFinancials);
  const maxStatusCount = Math.max(...dashboard.statusCounts.map((item) => item.count), 0);

  const kpis = [
    { label: copy.orders, value: String(dashboard.totals.orders), icon: ClipboardList },
    { label: copy.newOrders, value: String(dashboard.totals.newOrders), icon: PackageCheck },
    ...(canSeeFinancials
      ? [
          {
            label: copy.revenue,
            value: formatPrice(dashboard.totals.revenue ?? 0, locale, "USD"),
            icon: DollarSign,
          },
          {
            label: copy.grossProfit,
            value: formatPrice(dashboard.totals.grossProfit ?? 0, locale, "USD"),
            icon: TrendingUp,
          },
          {
            label: copy.averageOrderValue,
            value: formatPrice(dashboard.totals.averageOrderValue ?? 0, locale, "USD"),
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
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
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
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.label}
              className="rounded-[1.7rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{item.label}</p>
                <Icon className="h-4 w-4 text-[color:var(--color-accent-strong)]" />
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
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
                        {formatPrice(product.revenue, locale, "USD")}
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
                        {formatPrice(product.grossProfit ?? 0, locale, "USD")}
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
                        {inventoryLabels[product.inventoryStatus as keyof typeof inventoryLabels]?.[locale] ?? product.inventoryStatus} • {product.stock}
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
        <article className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {canSeeFinancials ? copy.ownerTools : copy.managerTools}
          </h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Link
              href="/admin/orders"
              className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-5 transition hover:border-[color:var(--color-accent-line)]"
            >
              <h4 className="text-lg font-semibold text-[color:var(--color-text)]">{copy.ordersLink}</h4>
              <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">
                {copy.recentOrdersSubtitle}
              </p>
            </Link>
            <Link
              href="/admin/products"
              className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-5 transition hover:border-[color:var(--color-accent-line)]"
            >
              <h4 className="text-lg font-semibold text-[color:var(--color-text)]">{copy.productsLink}</h4>
              <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">
                {copy.topSellingSubtitle}
              </p>
            </Link>
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
