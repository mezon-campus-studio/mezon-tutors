'use client';

import { useEffect } from 'react';

export default function ScrollRestoration() {
  useEffect(() => {
    if (!('scrollRestoration' in history)) return;

    history.scrollRestoration = 'manual';

    const saveScroll = () => {
      sessionStorage.setItem(
        `scroll:${location.pathname}${location.search}`,
        window.scrollY.toString()
      );
    };

    const restoreScroll = () => {
      const saved = sessionStorage.getItem(
        `scroll:${location.pathname}${location.search}`
      );

      if (!saved) return;

      const y = Number(saved);

      let count = 0;

      const restore = () => {
        const max =
          document.documentElement.scrollHeight - window.innerHeight;

        if (max >= y || count > 120) {
          window.scrollTo(0, y);
          return;
        }

        count++;
        requestAnimationFrame(restore);
      };

      requestAnimationFrame(restore);
    };

    window.addEventListener('scroll', saveScroll, { passive: true });
    window.addEventListener('pagehide', saveScroll);
    window.addEventListener('pageshow', restoreScroll);
    window.addEventListener('popstate', restoreScroll);

    restoreScroll();

    return () => {
      saveScroll();

      window.removeEventListener('scroll', saveScroll);
      window.removeEventListener('pagehide', saveScroll);
      window.removeEventListener('pageshow', restoreScroll);
      window.removeEventListener('popstate', restoreScroll);
    };
  }, []);

  return null;
}