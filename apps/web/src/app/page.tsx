import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createPageMetadata, DEFAULT_OG_IMAGE_PATH } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import HomePage from "@/views/home-page";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createPageMetadata({
    title: seo.home.title,
    description: seo.home.description,
    path: ROUTES.HOME.index,
    image: DEFAULT_OG_IMAGE_PATH,
  });
}

export default function Home() {
  return <HomePage />;
}
