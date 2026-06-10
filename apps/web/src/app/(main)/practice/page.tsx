import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";
import PracticePage from "@/views/main/practice";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.practice.title,
    description: seo.practice.description,
    path: ROUTES.PRACTICE,
  });
}

export default function Page() {
  return <PracticePage />;
}
