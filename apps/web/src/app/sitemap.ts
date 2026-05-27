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
  ];
}
