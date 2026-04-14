"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getActionErrorMessage, readApiPayload } from "@/components/product/client-feedback";
import type { AppLocale } from "@/lib/constants";

export function ConfiguratorChooseButton({
  slot,
  productId,
  buildSlug,
  buildName,
  disabled = false,
}: {
  slot: string;
  productId: string;
  buildSlug?: string | null;
  buildName?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations();
  const [pending, setPending] = useState(false);

  return (
    <Button
      onClick={() => {
        setPending(true);

        startTransition(async () => {
          try {
            let resolvedBuildSlug = buildSlug ?? null;

            if (!resolvedBuildSlug) {
              const createResponse = await fetch("/api/configurator/builds", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  locale,
                  name: buildName,
                }),
              });

              if (!createResponse.ok) {
                const payload = await readApiPayload(createResponse);
                throw new Error(payload.error || "Не вдалося створити збірку");
              }

              const payload = (await createResponse.json()) as {
                build?: { slug: string };
              };
              resolvedBuildSlug = payload.build?.slug ?? null;
            }

            if (!resolvedBuildSlug) {
              throw new Error(t("chooseComponentErrorNoBuild"));
            }

            const response = await fetch(`/api/configurator/builds/${resolvedBuildSlug}/items`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                locale,
                slot,
                productId,
              }),
            });

            if (!response.ok) {
              const payload = await readApiPayload(response);
              throw new Error(payload.error || "Не вдалося обрати компонент");
            }

            toast.success(t("chooseComponentSuccess"));
            router.push(`/configurator?build=${resolvedBuildSlug}`);
            router.refresh();
          } catch (error) {
            toast.error(
              error instanceof Error && error.message
                ? error.message
                : getActionErrorMessage(locale),
            );
          } finally {
            setPending(false);
          }
        });
      }}
      disabled={pending || disabled}
      className="w-full"
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      <span>{t("chooseComponent")}</span>
    </Button>
  );
}
