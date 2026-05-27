import type { MetadataRoute } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: [ROUTES.HOME.index, ROUTES.TUTOR.INDEX],
      disallow: [
        ROUTES.DASHBOARD.INDEX,
        ROUTES.CHECKOUT.INDEX,
        ROUTES.BECOME_TUTOR.INDEX,
        ROUTES.ADMIN.TUTOR_APPLICATIONS,
        ROUTES.AUTH.MEZON_CALLBACK,
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
