import type { Metadata } from "next";
import { ROUTES } from "@mezon-tutors/shared";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSeoMessages } from "@/lib/seo-messages";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoMessages();
  return createNoIndexMetadata({
    title: seo.authCallback.title,
    description: seo.authCallback.description,
    path: ROUTES.AUTH.MEZON_CALLBACK,
  });
}

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
