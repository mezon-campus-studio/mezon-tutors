import type { Metadata } from "next";
import { cache } from "react";
import { ROUTES, type TutorAboutDto } from "@mezon-tutors/shared";
import { getSeoMessages, type SeoMessages } from "./seo-messages";

export const SITE_NAME = "Mezonly";

export const DEFAULT_OG_IMAGE_PATH = "/brand/social/og-image-1200x630.png";
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;

const DEFAULT_SITE_URL = "https://www.mezonly.com";

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!url) {
    return DEFAULT_SITE_URL;
  }
  try {
    return new URL(url).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function formatSeoTemplate(
  template: string,
  vars: Record<string, string | number | undefined>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function getDefaultOgImageUrl(siteUrl = getSiteUrl()): string {
  return new URL(DEFAULT_OG_IMAGE_PATH, siteUrl).toString();
}

function resolveOgImageUrl(image: string | null | undefined, siteUrl: string): string {
  if (!image) {
    return getDefaultOgImageUrl(siteUrl);
  }
  try {
    return new URL(image, siteUrl).toString();
  } catch {
    return getDefaultOgImageUrl(siteUrl);
  }
}

function truncate(text: string, maxLength: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

type PageMetadataInput = {
  title: string;
  openGraphTitle?: string;
  description: string;
  openGraphDescription?: string;
  path?: string;
  image?: string | null;
  index?: boolean;
};

export function buildPageMetadata(
  input: PageMetadataInput,
  siteUrl = getSiteUrl(),
): Metadata {
  const canonicalPath = input.path ?? ROUTES.HOME.index;
  const url = new URL(canonicalPath, siteUrl).toString();
  const indexable = input.index !== false;
  const ogImageUrl = resolveOgImageUrl(input.image, siteUrl);
  const isDefaultOgImage = ogImageUrl === getDefaultOgImageUrl(siteUrl);
  const ogTitle = input.openGraphTitle?.trim() || input.title;
  const ogDescription = input.openGraphDescription?.trim() || input.description;
  const images = [
    isDefaultOgImage
      ? {
          url: ogImageUrl,
          width: DEFAULT_OG_IMAGE_WIDTH,
          height: DEFAULT_OG_IMAGE_HEIGHT,
          alt: ogTitle,
        }
      : { url: ogImageUrl, alt: ogTitle },
  ];

  return {
    title: { absolute: input.title },
    description: input.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: ogTitle,
      description: ogDescription,
      url,
      locale: "vi_VN",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImageUrl],
    },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
  };
}

export async function createPageMetadata(
  input: PageMetadataInput,
): Promise<Metadata> {
  return buildPageMetadata(input);
}

export async function createNoIndexMetadata(
  input: Omit<PageMetadataInput, "index">,
): Promise<Metadata> {
  return buildPageMetadata({ ...input, index: false });
}

export function createRootMetadata(siteUrl = getSiteUrl()): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    applicationName: SITE_NAME,
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    icons: {
      icon: [
        { url: "/brand/icons/favicon.ico", sizes: "16x16 32x32 48x48" },
        { url: "/brand/icons/favicon.svg", type: "image/svg+xml" },
        { url: "/brand/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [{ url: "/brand/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    manifest: "/brand/icons/site.webmanifest",
  };
}

export const fetchTutorAboutForSeo = cache(async (id: string): Promise<TutorAboutDto | null> => {
  const base = process.env.NEXT_PUBLIC_API_ENDPOINT?.replace(/\/$/, "");
  if (!base || !id) {
    return null;
  }

  try {
    const res = await fetch(`${base}/tutor-profiles/${id}/about`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return null;
    }
    const body = (await res.json()) as { data?: TutorAboutDto | null; error?: unknown };
    return body.data ?? null;
  } catch {
    return null;
  }
});

export async function buildTutorDetailMetadata(
  id: string,
  messages?: SeoMessages,
): Promise<Metadata> {
  const seo = messages ?? (await getSeoMessages());
  const tutor = await fetchTutorAboutForSeo(id);

  if (!tutor) {
    return buildPageMetadata({
      title: seo.tutorDetail.fallbackTitle,
      description: seo.tutorDetail.fallbackDescription,
      path: ROUTES.TUTOR.DETAIL(id),
      index: true,
    });
  }

  const name = `${tutor.firstName} ${tutor.lastName}`.trim();
  const snippet = truncate(tutor.headline || tutor.introduce || seo.tutorDetail.fallbackDescription, 160);

  return buildPageMetadata({
    title: formatSeoTemplate(seo.tutorDetail.title, {
      name,
      subject: tutor.subject,
    }),
    description: formatSeoTemplate(seo.tutorDetail.description, { snippet }),
    path: ROUTES.TUTOR.DETAIL(id),
    image: tutor.avatar || null,
    index: true,
  });
}
