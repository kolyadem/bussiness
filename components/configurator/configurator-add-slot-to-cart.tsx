"use client";

import { LoaderCircle, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getActionErrorMessage, readApiPayload } from "@/components/product/client-feedback";
import type { AppLocale } from "@/lib/constants";
import type { ConfiguratorSlotKey } from "@/lib/storefront/configurator";

export function ConfiguratorAddSlotToCartButton({
  locale,
  buildSlug,
  slot,
  productId,
  label,
  disabled = false,
  compact = false,
}: {
  locale: AppLocale;
  buildSlug: string;
  slot: ConfiguratorSlotKey;
  productId: string;
  label: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslations();

  return (
    <Button
      type="button"
      variant="secondary"
      className={cn(
        "gap-1.5",
        compact ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
      )}
      disabled={disabled || pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const response = await fetch("/api/cart", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                productId,
                quantity: 1,
                pcBuild: {
                  slug: buildSlug,
                  slot,
                },
              }),
            });

            if (!response.ok) {
              const payload = await readApiPayload(response);
              throw new Error(payload.error || t("cartAddFailed"));
            }

            toast.success(t("addedToCart"));
            router.refresh();
          } catch {
            toast.error(getActionErrorMessage(locale));
          }
        });
      }}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
      <span>{label}</span>
    </Button>
  );
}
