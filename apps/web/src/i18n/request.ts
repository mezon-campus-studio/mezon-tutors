import { getRequestConfig, RequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { loadMessagesForLocale, resolveLocale } from "./load-messages";

export { DEFAULT_LOCALE } from "./load-messages";

export default getRequestConfig(async (): Promise<RequestConfig> => {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale = resolveLocale(cookieLocale);
  const messages = await loadMessagesForLocale(locale);

  return {
    locale,
    messages,
  };
});
