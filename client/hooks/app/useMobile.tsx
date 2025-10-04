import * as React from 'react';

/** Breakpoint in pixels below which the device is considered mobile */
const MOBILE_BREAKPOINT = 768;

/**
 * Custom hook to detect if the current device is mobile
 *
 * Uses CSS media queries to determine if the viewport width is below
 * the mobile breakpoint (768px). Updates automatically on window resize.
 *
 * @returns Boolean indicating if the device is mobile
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 *
 * return (
 *   <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
 *     {content}
 *   </div>
 * );
 * ```
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
