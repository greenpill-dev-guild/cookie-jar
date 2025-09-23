"use client";

import { useRouter } from "next/navigation";

/**
 * Return type for useNavigateToTop hook
 */
interface NavigateToTopReturn {
  /** Navigate to a path and scroll to top */
  navigateToTop: (path: string) => Promise<void>;
  /** Scroll to top of current page without navigation */
  scrollToTop: () => void;
}

/**
 * Custom hook for navigation with automatic scroll-to-top functionality
 * 
 * Provides utilities for navigating between pages while ensuring the user
 * is scrolled to the top. Handles different scroll containers and fallback
 * methods for reliable cross-browser behavior.
 * 
 * @returns Object with navigation and scroll functions
 * 
 * @example
 * ```tsx
 * const { navigateToTop, scrollToTop } = useNavigateToTop();
 * 
 * // Navigate to new page and scroll to top
 * navigateToTop('/new-page');
 * 
 * // Just scroll to top of current page
 * scrollToTop();
 * ```
 */
export const useNavigateToTop = (): NavigateToTopReturn => {
  const router = useRouter();

  const navigateToTop = async (path: string) => {
    // First, scroll to top immediately
    const el = document.getElementById("app-scroll");
    if (el) {
      el.scrollTop = 0;
    } else {
      // Try scrolling to header first
      const header =
        document.querySelector("header") ||
        document.querySelector('[role="banner"]');
      if (header) {
        header.scrollIntoView({
          behavior: "auto",
          block: "start",
          inline: "nearest",
        });
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    }

    // Small delay to ensure scroll completes before navigation
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Then navigate
    router.push(path);
  };

  const scrollToTop = () => {
    const el = document.getElementById("app-scroll");
    if (el) {
      el.scrollTop = 0;
    } else {
      // Try scrolling to header first
      const header =
        document.querySelector("header") ||
        document.querySelector('[role="banner"]');
      if (header) {
        header.scrollIntoView({
          behavior: "auto",
          block: "start",
          inline: "nearest",
        });
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    }
  };

  return { navigateToTop, scrollToTop };
};
