import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { loadMessagesForLocale, resolveLocale } from "@/i18n/load-messages";

export async function IntlServerProvider({ children }: { children: ReactNode }) {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale = resolveLocale(cookieLocale);
  const messages = await loadMessagesForLocale(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
