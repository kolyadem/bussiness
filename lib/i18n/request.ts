import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { defaultLocale, locales } from "@/lib/constants";
import { messages } from "@/lib/i18n/messages";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const resolved = hasLocale(locales, locale) ? locale : defaultLocale;

  return {
    locale: resolved,
    messages: messages[resolved],
  };
});
