import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createPageMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import HomePage from "@/views/home-page";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createPageMetadata({
    title: seo.home.title,
    description: seo.home.description,
    path: ROUTES.HOME.index,
  });
}

export default function Home() {
  return <HomePage />;
}
