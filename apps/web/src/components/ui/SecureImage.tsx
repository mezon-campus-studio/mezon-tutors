"use client";

import { useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { accessTokenAtom } from "@/store/token.atom";
import { BASE_URL } from "@/services/api-client";

type SecureImageProps = {
  /** Backend proxy path, e.g. /admin/tutor-profiles/:id/identity-verification/image */
  proxyPath: string;
  alt: string;
  className?: string;
};

/**
 * Fetches a backend-proxied image using the current JWT access token
 * and renders it as a blob URL so the real Cloudinary URL is never exposed.
 */
export default function SecureImage({ proxyPath, alt, className }: SecureImageProps) {
  const token = useAtomValue(accessTokenAtom);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const prevBlobUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!proxyPath || !token) return;

    let cancelled = false;
    setError(false);

    const url = `${BASE_URL}${proxyPath}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
        prevBlobUrl.current = objectUrl;
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [proxyPath, token]);

  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
    };
  }, []);

  if (error) return <span className="text-xs text-red-500">Failed to load image</span>;
  if (!blobUrl) return <span className="text-xs text-slate-400">Loading…</span>;
  return <img src={blobUrl} alt={alt} className={className} />;
}
