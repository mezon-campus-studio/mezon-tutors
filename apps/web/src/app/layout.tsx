import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE } from "@/i18n/request";
import { createRootMetadata, getSiteUrl } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
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

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  const siteUrl = getSiteUrl();

  return {
    ...createRootMetadata(siteUrl),
    title: seo.default.title,
    description: seo.default.description,
    keywords: [
      "Mezonly",
      "gia sư",
      "tutor",
      "học trực tuyến",
      "Mezon",
      "online tutoring",
    ],
    openGraph: {
      type: "website",
      siteName: seo.siteName,
      title: seo.default.title,
      description: seo.default.description,
      url: siteUrl,
      images: [
        {
          url: "/images/Mezonly-logo.png",
          width: 512,
          height: 512,
          alt: seo.siteName,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: seo.default.title,
      description: seo.default.description,
      images: [new URL("/images/Mezonly-logo.png", siteUrl).toString()],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

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
