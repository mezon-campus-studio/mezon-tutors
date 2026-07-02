"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import ReactGA from "react-ga4";
import { initGA } from "@/lib/google-analytics/analytics";

function GAListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    const url =
      pathname + (searchParams?.toString() ? `?${searchParams}` : "");

    ReactGA.send({
      hitType: "pageview",
      page: url,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function GAProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <GAListener />
      </Suspense>
      {children}
    </>
  );
}