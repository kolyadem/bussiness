import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/lib/constants";
import { cn } from "@/lib/utils";

export async function Footer({
  locale,
  brandName,
  supportEmail,
  supportPhone,
  address,
  socials,
  contactLinks,
}: {
  locale: AppLocale;
  brandName: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  socials?: Array<{
    label: string;
    href: string;
  }>;
  contactLinks?: Array<{
    label: string;
    href: string;
  }>;
}) {
  const t = await getTranslations({ locale });
  const currentYear = new Date().getFullYear();

  const addressLine = address.trim();
  const emailLine = supportEmail.trim();
  const phoneLine = supportPhone.trim();
  const hasLinks = (contactLinks?.length ?? 0) > 0 || (socials?.length ?? 0) > 0;
  const showContactColumn = Boolean(emailLine || phoneLine || hasLinks);

  return (
    <footer className="px-3 pb-6 pt-12 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <div
        className={cn(
          "storefront-shell mx-auto grid gap-5 rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-strong)] px-4 py-7 text-sm text-[color:var(--color-text-soft)] shadow-[var(--shadow-strong)] sm:px-6 xl:px-7",
          showContactColumn
            ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(0,0.85fr)]"
            : "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)]",
        )}
      >
        <div className="min-w-0">
          <p className="font-heading text-base font-semibold text-[color:var(--color-text)]">
            {brandName}
          </p>
          {addressLine ? <p className="mt-2 max-w-sm leading-6">{addressLine}</p> : null}
        </div>
        {showContactColumn ? (
          <div className="min-w-0">
            {emailLine ? (
              <p className="break-words text-[color:var(--color-text)]">{emailLine}</p>
            ) : null}
            {phoneLine ? <p className="mt-2 break-words">{phoneLine}</p> : null}
            {contactLinks && contactLinks.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-3">
                {contactLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:text-[color:var(--color-text)]"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            ) : null}
            {socials && socials.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-3">
                {socials.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:text-[color:var(--color-text)]"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={cn("lg:text-right", !showContactColumn && "lg:col-start-2")}>
          <p>
            {currentYear} {brandName}
          </p>
          <p className="mt-2">{t("footerRights")}</p>
        </div>
      </div>
    </footer>
  );
}
