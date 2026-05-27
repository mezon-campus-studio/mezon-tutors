'use client';

import { useEffect, useRef } from 'react';

const HISTORY_SENTINEL = { unsavedChangesGuard: true } as const;

type UseUnsavedChangesGuardOptions = {
  onLeaveAttempt: (proceed: () => void) => void;
  navigate?: (href: string) => void;
};

function isReloadShortcut(event: KeyboardEvent): boolean {
  if (event.key === 'F5') return true;
  if (event.key !== 'r' && event.key !== 'R') return false;
  return event.ctrlKey || event.metaKey;
}

export function useUnsavedChangesGuard(
  enabled: boolean,
  { onLeaveAttempt, navigate }: UseUnsavedChangesGuardOptions
) {
  const enabledRef = useRef(enabled);
  const onLeaveAttemptRef = useRef(onLeaveAttempt);
  const navigateRef = useRef(navigate);
  const historySentinelPushedRef = useRef(false);
  const suppressSentinelCleanupRef = useRef(false);

  const invokeLeaveAttempt = (proceed: () => void) => {
    onLeaveAttemptRef.current(() => {
      historySentinelPushedRef.current = false;
      suppressSentinelCleanupRef.current = true;
      proceed();
    });
  };

  enabledRef.current = enabled;
  onLeaveAttemptRef.current = onLeaveAttempt;
  navigateRef.current = navigate;

  useEffect(() => {
    if (!enabled) {
      if (historySentinelPushedRef.current && !suppressSentinelCleanupRef.current) {
        historySentinelPushedRef.current = false;
        window.history.back();
      }
      suppressSentinelCleanupRef.current = false;
      return;
    }

    window.history.pushState(HISTORY_SENTINEL, '', window.location.href);
    historySentinelPushedRef.current = true;

    const onPopState = () => {
      if (!enabledRef.current) return;

      window.history.pushState(HISTORY_SENTINEL, '', window.location.href);

      invokeLeaveAttempt(() => {
        window.history.go(-2);
      });
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (historySentinelPushedRef.current && !suppressSentinelCleanupRef.current) {
        historySentinelPushedRef.current = false;
        window.history.back();
      }
      suppressSentinelCleanupRef.current = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabledRef.current) return;
      if (!isReloadShortcut(event)) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      invokeLeaveAttempt(() => {
        window.location.reload();
      });
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (!enabledRef.current) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!anchor) return;
      if (anchor.getAttribute('target') === '_blank') return;
      if (anchor.hasAttribute('download')) return;
      if (anchor.getAttribute('data-skip-unsaved-guard') === 'true') return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const current = new URL(window.location.href);
      if (
        url.pathname === current.pathname &&
        url.search === current.search &&
        url.hash === current.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const destination = `${url.pathname}${url.search}${url.hash}`;
      invokeLeaveAttempt(() => {
        if (navigateRef.current) {
          navigateRef.current(destination);
        } else {
          window.location.assign(destination);
        }
      });
    };

    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [enabled]);
}
