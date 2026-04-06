import { getRequestConfig } from "next-intl/server";
import { messages } from "@/lib/i18n/messages";

export default getRequestConfig(async () => ({
  locale: "uk",
  messages,
}));
