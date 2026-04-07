"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Heart, LoaderCircle, Scale, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getActionErrorMessage, readApiPayload } from "@/components/product/client-feedback";
import { getConfiguratorSlotForCategorySlug } from "@/lib/configurator/technical-attributes";
import { SITE_MODES, type SiteMode } from "@/lib/site-mode";

type ActionType = "cart" | "wishlist" | "compare";

function trackAnalytics(payload: Record<string, unknown>) {
  void fetch("/api/analytics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

async function mutate(
  endpoint: string,
  method: "POST" | "DELETE" | "PATCH",
  body?: Record<string, unknown>,
) {
  const response = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = await readApiPayload(response);
    throw new Error(payload.error || "Запит не вдався");
  }

  return readApiPayload(response);
}

export function ProductActions({
  productId,
  compact = false,
  siteMode = SITE_MODES.store,
  productCategorySlug = null,
  context = "product",
  purchasable = true,
}: {
  productId: string;
  compact?: boolean;
  siteMode?: SiteMode;
  productCategorySlug?: string | null;
  context?: "catalog" | "product";
  purchasable?: boolean;
}) {
  const [pendingAction, setPendingAction] = useState<ActionType | null>(null);
  const [addedAction, setAddedAction] = useState<ActionType | null>(null);
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const isPcBuild = siteMode === SITE_MODES.pcBuild;
  const configuratorSlot = getConfiguratorSlotForCategorySlug(productCategorySlug);
  const requestSource =
    context === "catalog" ? "catalog-product-card" : "product-page";
  const primaryHref = configuratorSlot
    ? `/configurator/select?slot=${encodeURIComponent(configuratorSlot)}`
    : `/build-request?source=${encodeURIComponent(requestSource)}`;

  const wishlistAddedMessage = "Товар збережено в обраному";
  const compareAddedMessage = "Товар додано до порівняння";

  const run = (action: ActionType) => {
    setPendingAction(action);

    startTransition(async () => {
      try {
        if (action === "cart") {
          await mutate("/api/cart", "POST", { productId, quantity: 1 });
          trackAnalytics({
            event: "add_to_cart",
            pathname: window.location.pathname,
            locale,
            details: {
              productId,
              source: compact ? "compact-actions" : "product-actions",
            },
          });
          toast.success(t("addedToCart"));
        }

        if (action === "wishlist") {
          const payload = await mutate("/api/wishlist", "POST", { productId });
          toast.success(payload.created ? wishlistAddedMessage : t("inWishlist"));
        }

        if (action === "compare") {
          const payload = await mutate("/api/compare", "POST", { productId });
          toast.success(payload.created ? compareAddedMessage : t("inCompare"));
        }

        setAddedAction(action);
        window.setTimeout(() => {
          setAddedAction((current) => (current === action ? null : current));
        }, 1800);
        router.refresh();
      } catch {
        toast.error(getActionErrorMessage(locale));
      } finally {
        setPendingAction(null);
      }
    });
  };

  const addedLabel = "Додано";
  const pcBuildPrimaryLabel = configuratorSlot
    ? "Додати у збірку"
    : context === "catalog"
      ? "Обговорити збірку"
      : "Обговорити конфігурацію";

  return (
    <div className={`flex ${compact ? "gap-2" : "flex-col gap-3 sm:flex-row"}`}>
      <Button
        onClick={() => {
          if (!purchasable) return;
          if (isPcBuild) {
            router.push(primaryHref);
            return;
          }

          run("cart");
        }}
        disabled={!purchasable || (!isPcBuild && pendingAction !== null)}
        className={
          compact
            ? "h-11 flex-1 px-4 text-[13px]"
            : "h-13 rounded-[1.2rem] px-6 text-sm font-semibold sm:flex-1"
        }
      >
        {!isPcBuild && pendingAction === "cart" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : !isPcBuild && addedAction === "cart" ? (
          <Check className="h-4 w-4" />
        ) : (
          <ShoppingCart className="h-4 w-4" />
        )}
        <span className="ml-2">
          {!purchasable
            ? "Скоро в продажу"
            : isPcBuild
              ? pcBuildPrimaryLabel
              : addedAction === "cart"
                ? addedLabel
                : t("addToCart")}
        </span>
      </Button>
      <Button
        variant="secondary"
        onClick={() => run("wishlist")}
        disabled={pendingAction !== null}
        className={
          compact
            ? "h-11 w-11 shrink-0 px-0"
            : "h-13 rounded-[1.2rem] border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] sm:min-w-[11rem]"
        }
        aria-label={t("wishlist")}
      >
        {pendingAction === "wishlist" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : addedAction === "wishlist" ? (
          <Check className="h-4 w-4" />
        ) : (
          <Heart className="h-4 w-4" />
        )}
        {compact ? null : (
          <span className="ml-2">{addedAction === "wishlist" ? addedLabel : t("wishlist")}</span>
        )}
      </Button>
      <Button
        variant="secondary"
        onClick={() => run("compare")}
        disabled={pendingAction !== null}
        className={
          compact
            ? "h-11 w-11 shrink-0 px-0"
            : "h-13 rounded-[1.2rem] border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] sm:min-w-[11rem]"
        }
        aria-label={t("compare")}
      >
        {pendingAction === "compare" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : addedAction === "compare" ? (
          <Check className="h-4 w-4" />
        ) : (
          <Scale className="h-4 w-4" />
        )}
        {compact ? null : (
          <span className="ml-2">{addedAction === "compare" ? addedLabel : t("compare")}</span>
        )}
      </Button>
    </div>
  );
}
