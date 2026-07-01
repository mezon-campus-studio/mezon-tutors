import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Mono } from "next/font/google";
import { Suspense } from "react";
import { IntlServerProvider } from "@/components/providers/IntlServerProvider";
import { DEFAULT_LOCALE } from "@/i18n/request";
import {
  createRootMetadata,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_OG_IMAGE_WIDTH,
  getDefaultOgImageUrl,
  getSiteUrl,
} from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import "./globals.css";
import { Footer, Header } from "@/components/layouts";
import { AppProvider } from "@/providers";
import ScrollRestoration from "@/lib/scroll-restoration";
import Script from "next/script";

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
          url: DEFAULT_OG_IMAGE_PATH,
          width: DEFAULT_OG_IMAGE_WIDTH,
          height: DEFAULT_OG_IMAGE_HEIGHT,
          alt: seo.siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.default.title,
      description: seo.default.description,
      images: [getDefaultOgImageUrl(siteUrl)],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID!;
  return (
    <html
      lang={DEFAULT_LOCALE}
      className={`${notoSans.variable} ${notoSansMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full w-full max-w-full flex-col overflow-x-clip bg-white text-slate-900">
        <ScrollRestoration />
        <Suspense fallback={null}>
          <IntlServerProvider>
            <AppProvider>
              <Header />
              {children}
              <Footer />
            </AppProvider>
          </IntlServerProvider>
        </Suspense>
        <Script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}/>
        <Script id="google-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${GA_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
