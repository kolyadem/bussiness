import { notFound } from "next/navigation";
import { BuildRequestManagerNote } from "@/components/admin/build-request-manager-note";
import { BuildRequestStatusControl } from "@/components/admin/build-request-status-control";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import { Link } from "@/lib/i18n/routing";
import { getAdminBuildRequestById } from "@/lib/admin";
import {
  getBuildRequestBooleanLabel,
  getBuildRequestDeliveryMethodLabel,
  getBuildRequestNumber,
  getBuildRequestStatusLabel,
  getBuildRequestStatusTone,
  isBuildRequestDeliveryMethod,
  isBuildRequestStatus,
  parseBuildRequestItemsSnapshot,
  type BuildRequestDeliveryMethod,
} from "@/lib/storefront/build-requests";
import { getConfiguratorSlotLabel, isConfiguratorSlotKey } from "@/lib/storefront/configurator";
import { mapProduct } from "@/lib/storefront/queries";
import type { AppLocale } from "@/lib/constants";
import { getPromoEffectTypeLabelUa } from "@/lib/storefront/promo-codes";
import { formatPrice } from "@/lib/utils";

export default async function AdminBuildRequestDetailPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; id: string }>;
}) {
  const { locale, id } = await params;
  const request = await getAdminBuildRequestById(id);

  if (!request) {
    notFound();
  }

  const status = isBuildRequestStatus(request.status) ? request.status : "NEW";
  const deliveryMethod: BuildRequestDeliveryMethod | null = isBuildRequestDeliveryMethod(
    request.deliveryMethod ?? "",
  )
    ? (request.deliveryMethod as BuildRequestDeliveryMethod)
    : null;
  const snapshotItems = parseBuildRequestItemsSnapshot(request.itemsSnapshot);
  const liveItems = request.build.items.map((item) => {
    const product = mapProduct(item.product, locale);
    return {
      slotLabel: isConfiguratorSlotKey(item.slot) ? getConfiguratorSlotLabel(item.slot, locale) : item.slot,
      quantity: item.quantity,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      heroImage: product.heroImage,
      brandName: product.category.name,
      price: product.price,
      currency: product.currency,
    };
  });
  const items = snapshotItems.length > 0 ? snapshotItems : liveItems;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <Link
          href="/admin/build-requests"
          className="text-sm text-[color:var(--color-text-soft)] transition hover:text-[color:var(--color-text)]"
        >
          Назад до заявок
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {getBuildRequestNumber(request.id)}
          </h2>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getBuildRequestStatusTone(status)}`}
          >
            {getBuildRequestStatusLabel(status, locale)}
          </span>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
              Контакти
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Клієнт
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{request.customerName}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Контакт
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{request.contact}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Телефон
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{request.phone ?? "—"}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">Email</p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{request.email ?? "—"}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 sm:col-span-2">
                <p className="text-sm text-[color:var(--color-text-soft)]">Telegram</p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">
                  {request.telegramUsername ?? "—"}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
              Бриф по запиту
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Бюджет
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">
                  {request.budget ? formatPrice(request.budget, locale, request.currency) : "—"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Місто
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{request.deliveryCity ?? "—"}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 sm:col-span-2">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Для чого потрібен ПК
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[color:var(--color-text)]">
                  {request.useCase ?? "—"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 sm:col-span-2">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Побажання
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[color:var(--color-text)]">
                  {request.preferences ?? "—"}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
              Потреби клієнта
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Монітор
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">
                  {getBuildRequestBooleanLabel(request.needsMonitor, locale)}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Периферія
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">
                  {getBuildRequestBooleanLabel(request.needsPeripherals, locale)}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Апгрейд
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">
                  {getBuildRequestBooleanLabel(request.needsUpgrade, locale)}
                </p>
              </div>
            </div>

            {request.comment ? (
              <div className="mt-3 rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Контекст / джерело
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[color:var(--color-text)]">
                  {request.comment}
                </p>
              </div>
            ) : null}
          </article>

          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
              Конфігурація
            </h3>
            {items.length === 0 ? (
              <div className="mt-4 rounded-[1.4rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 text-sm leading-7 text-[color:var(--color-text-soft)]">
                Це швидка заявка без готової конфігурації. Менеджер працює з брифом і бюджетом.
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                {items.map((item) => (
                  <article
                    key={`${item.productId}-${item.slotLabel}`}
                    className="grid gap-4 rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4 sm:grid-cols-[96px_minmax(0,1fr)]"
                  >
                    <ProductImageFrame
                      src={item.heroImage}
                      alt={item.productName}
                      className="rounded-[1.2rem]"
                      fillClassName="p-3"
                    />
                    <div className="flex min-w-0 flex-col justify-between gap-3">
                      <div>
                        <p className="text-sm text-[color:var(--color-text-soft)]">{item.slotLabel}</p>
                        <p className="mt-1 line-clamp-2 text-lg font-medium text-[color:var(--color-text)]">
                          {item.productName}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">{item.brandName}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[color:var(--color-text-soft)]">x{item.quantity}</p>
                        <p className="text-lg font-semibold text-[color:var(--color-text)]">
                          {formatPrice(item.price * item.quantity, locale, item.currency)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-[calc(var(--header-offset)+0.75rem)] xl:self-start">
          <section className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
              Статус заявки
            </h3>
            <div className="mt-4">
              <BuildRequestStatusControl requestId={request.id} locale={locale} value={status} />
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <BuildRequestManagerNote
              requestId={request.id}
              locale={locale}
              initialValue={request.managerNote ?? ""}
            />
          </section>

          <section className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <div className="grid gap-3">
              {request.promoCodeCodeSnapshot ? (
                <div className="rounded-[1.4rem] border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-4 py-4">
                  <p className="text-sm text-[color:var(--color-text-soft)]">Промокод</p>
                  <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{request.promoCodeCodeSnapshot}</p>
                  <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                    Тип ефекту:{" "}
                    <span className="font-medium text-[color:var(--color-text)]">
                      {getPromoEffectTypeLabelUa(request.promoEffectType)}
                    </span>
                  </p>
                  {request.promoDiscountAmount > 0 ? (
                    <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                      Знижка:{" "}
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                        −{formatPrice(request.promoDiscountAmount, locale, request.currency)}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs leading-5 text-[color:var(--color-text-soft)]">
                      Знижку буде уточнено менеджером
                    </p>
                  )}
                </div>
              ) : null}
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Бюджет / сума
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--color-text)]">
                  {formatPrice(
                    request.budget ?? (request.totalPrice > 0 ? request.totalPrice : request.build.totalPrice),
                    locale,
                    request.currency,
                  )}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Збірка
                </p>
                <p className="mt-2 break-all text-sm font-medium text-[color:var(--color-text)]">
                  {request.build.name}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Доставка
                </p>
                <p className="mt-2 text-sm font-medium text-[color:var(--color-text)]">
                  {deliveryMethod ? getBuildRequestDeliveryMethodLabel(deliveryMethod, locale) : "—"}
                </p>
                {deliveryMethod === "NOVA_POSHTA_BRANCH" && request.deliveryBranch ? (
                  <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                    Відділення: {request.deliveryBranch}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
