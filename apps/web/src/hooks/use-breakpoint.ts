import * as React from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'laptop' | 'desktop';

const BREAKPOINTS = {
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
} as const;

function resolveBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.tablet) return 'mobile';
  if (width < BREAKPOINTS.laptop) return 'tablet';
  if (width < BREAKPOINTS.desktop) return 'laptop';
  return 'desktop';
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>('desktop');

  React.useEffect(() => {
    const onChange = () => {
      setBreakpoint(resolveBreakpoint(window.innerWidth));
    };

    onChange();
    window.addEventListener('resize', onChange);
    return () => window.removeEventListener('resize', onChange);
  }, []);

  return breakpoint;
}

export function useIsBelowLaptop(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'mobile' || breakpoint === 'tablet';
}
