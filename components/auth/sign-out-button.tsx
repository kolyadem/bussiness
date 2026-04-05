"use client";

import { useTransition } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function SignOutButton() {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await signOut({ redirect: false });
          router.refresh();
        })
      }
      className="inline-flex h-10 items-center justify-center rounded-full border border-[color:var(--color-line)] px-4 text-sm text-[color:var(--color-text)] transition hover:border-[color:var(--color-line-strong)] hover:bg-[color:var(--color-surface-elevated)] disabled:cursor-not-allowed disabled:opacity-65"
    >
      {t("authSignOut")}
    </button>
  );
}
