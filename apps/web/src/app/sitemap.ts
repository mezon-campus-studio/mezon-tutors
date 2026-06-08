import type { MetadataRoute } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { getSiteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL(ROUTES.TUTOR.INDEX, siteUrl).toString(),
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: new URL(ROUTES.SUPPORT.LEGAL_CENTER, siteUrl).toString(),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: new URL(ROUTES.SUPPORT.TERMS_OF_SERVICE, siteUrl).toString(),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: new URL(ROUTES.SUPPORT.PRIVACY_POLICY, siteUrl).toString(),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: new URL(ROUTES.SUPPORT.REFUND_POLICY, siteUrl).toString(),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: new URL(ROUTES.SUPPORT.TUTOR_POLICY, siteUrl).toString(),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
