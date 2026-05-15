import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE } from "@/i18n/request";
import "./globals.css";
import { Footer, Header } from "@/components/layouts";
import { AppProvider } from "@/providers";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "vietnamese"],
});

const notoSansMono = Noto_Sans_Mono({
  variable: "--font-noto-sans-mono",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Mezonly",
  description: "Mezon Tutors landing page",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale =
    cookieLocale === "vi" || cookieLocale === "en" ? cookieLocale : DEFAULT_LOCALE;
  return (
    <html
      lang={locale}
      className={`${notoSans.variable} ${notoSansMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        <NextIntlClientProvider locale={locale}>
          <AppProvider>
            <Header />
            {children}
            <Footer />
          </AppProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
