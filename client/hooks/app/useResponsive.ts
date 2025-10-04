import { useEffect, useState } from "react";

export interface UseResponsiveOptions {
	/** Custom breakpoint in pixels (default: 768) */
	breakpoint?: number;
	/** Whether to use matchMedia API for better performance */
	useMatchMedia?: boolean;
}

export interface UseResponsiveReturn {
	/** Whether the current screen is mobile size */
	isMobile: boolean;
	/** Whether the current screen is tablet size */
	isTablet: boolean;
	/** Whether the current screen is desktop size */
	isDesktop: boolean;
	/** Current screen width */
	screenWidth: number;
	/** Current breakpoint name */
	breakpoint: "mobile" | "tablet" | "desktop";
}

/**
 * Hook for responsive design detection
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useResponsive();
 *
 * return (
 *   <div>
 *     {isMobile && <MobileComponent />}
 *     {isDesktop && <DesktopComponent />}
 *   </div>
 * );
 * ```
 */
export function useResponsive(
	options: UseResponsiveOptions = {},
): UseResponsiveReturn {
	const {
		breakpoint = 768, // md breakpoint
		useMatchMedia = true,
	} = options;

	const tabletBreakpoint = 1024; // lg breakpoint

	const [screenWidth, setScreenWidth] = useState(0);
	const [isMobile, setIsMobile] = useState(false);
	const [isTablet, setIsTablet] = useState(false);
	const [isDesktop, setIsDesktop] = useState(false);

	useEffect(() => {
		// Initialize values
		const updateScreenSize = () => {
			const width = window.innerWidth;
			setScreenWidth(width);

			const mobile = width < breakpoint;
			const tablet = width >= breakpoint && width < tabletBreakpoint;
			const desktop = width >= tabletBreakpoint;

			setIsMobile(mobile);
			setIsTablet(tablet);
			setIsDesktop(desktop);
		};

		// Initial check
		updateScreenSize();

		if (useMatchMedia && window.matchMedia) {
			// Use matchMedia for better performance
			const mobileQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
			const tabletQuery = window.matchMedia(
				`(min-width: ${breakpoint}px) and (max-width: ${tabletBreakpoint - 1}px)`,
			);
			const desktopQuery = window.matchMedia(
				`(min-width: ${tabletBreakpoint}px)`,
			);

			const handleMobileChange = (e: MediaQueryListEvent) => {
				setIsMobile(e.matches);
				if (e.matches) {
					setIsTablet(false);
					setIsDesktop(false);
				}
			};

			const handleTabletChange = (e: MediaQueryListEvent) => {
				setIsTablet(e.matches);
				if (e.matches) {
					setIsMobile(false);
					setIsDesktop(false);
				}
			};

			const handleDesktopChange = (e: MediaQueryListEvent) => {
				setIsDesktop(e.matches);
				if (e.matches) {
					setIsMobile(false);
					setIsTablet(false);
				}
			};

			// Add listeners
			mobileQuery.addListener(handleMobileChange);
			tabletQuery.addListener(handleTabletChange);
			desktopQuery.addListener(handleDesktopChange);

			// Cleanup
			return () => {
				mobileQuery.removeListener(handleMobileChange);
				tabletQuery.removeListener(handleTabletChange);
				desktopQuery.removeListener(handleDesktopChange);
			};
		} else {
			// Fallback to resize listener
			window.addEventListener("resize", updateScreenSize);
			return () => window.removeEventListener("resize", updateScreenSize);
		}
	}, [breakpoint, useMatchMedia]);

	const currentBreakpoint: "mobile" | "tablet" | "desktop" = isMobile
		? "mobile"
		: isTablet
			? "tablet"
			: "desktop";

	return {
		isMobile,
		isTablet,
		isDesktop,
		screenWidth,
		breakpoint: currentBreakpoint,
	};
}

/**
 * Hook for mobile-first responsive design
 */
export function useMobileFirst(breakpoint: number = 768) {
	const { isMobile } = useResponsive({ breakpoint });
	return isMobile;
}

/**
 * Hook for desktop-first responsive design
 */
export function useDesktopFirst(breakpoint: number = 768) {
	const { isDesktop } = useResponsive({ breakpoint });
	return isDesktop;
}

/**
 * Predefined breakpoints following Tailwind CSS conventions
 */
export const breakpoints = {
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	"2xl": 1536,
} as const;

/**
 * Hook with predefined Tailwind breakpoints
 */
export function useTailwindBreakpoints() {
	const sm = useResponsive({ breakpoint: breakpoints.sm });
	const md = useResponsive({ breakpoint: breakpoints.md });
	const lg = useResponsive({ breakpoint: breakpoints.lg });
	const xl = useResponsive({ breakpoint: breakpoints.xl });

	return {
		sm: sm.screenWidth >= breakpoints.sm,
		md: md.screenWidth >= breakpoints.md,
		lg: lg.screenWidth >= breakpoints.lg,
		xl: xl.screenWidth >= breakpoints.xl,
		"2xl": xl.screenWidth >= breakpoints["2xl"],

		// Convenience aliases
		mobile: sm.screenWidth < breakpoints.md,
		tablet: sm.screenWidth >= breakpoints.md && sm.screenWidth < breakpoints.lg,
		desktop: sm.screenWidth >= breakpoints.lg,

		current: sm.breakpoint,
		width: sm.screenWidth,
	};
}
