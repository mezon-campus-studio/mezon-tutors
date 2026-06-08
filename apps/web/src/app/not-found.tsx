import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import NotFoundPage from "@/views/errors/not-found/NotFoundPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Common.NotFound");
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default function NotFound() {
  return <NotFoundPage />;
}
