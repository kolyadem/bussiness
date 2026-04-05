import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AccountAuthPanel } from "@/components/auth/account-auth-panel";
import type { AppLocale } from "@/lib/constants";
import { getAuthenticatedUser, getPostLoginPath } from "@/lib/auth";
import { pageMetadata } from "@/lib/storefront/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return pageMetadata(locale, "homeSeoTitle", `${t("authTabsLogin")} | Lumina Tech`, "/login", {
    title: t("authTabsLogin"),
    indexable: false,
  });
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(getPostLoginPath(locale, user.role));
  }

  return (
    <main className="storefront-shell mx-auto flex min-h-[calc(100vh-14rem)] items-center justify-center px-4 py-10 sm:px-6 lg:px-8 xl:px-10">
      <section className="w-full rounded-[2.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-8 lg:max-w-[36rem] lg:p-10">
        <div className="space-y-6 text-center">
          <h1 className="font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
            {t("authTabsLogin")}
          </h1>
          <AccountAuthPanel />
        </div>
      </section>
    </main>
  );
}
