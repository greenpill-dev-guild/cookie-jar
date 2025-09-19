'use client'

import { useRouter } from "next/navigation";

export const useNavigateToTop = () => {
  const router = useRouter();

  const navigateToTop = async (path: string) => {
    // First, scroll to top immediately
    const el = document.getElementById("app-scroll");
    if (el) {
      el.scrollTop = 0;
    } else {
      // Try scrolling to header first
      const header = document.querySelector('header') || document.querySelector('[role="banner"]');
      if (header) {
        header.scrollIntoView({
          behavior: 'auto',
          block: 'start',
          inline: 'nearest'
        });
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    }
    
    // Small delay to ensure scroll completes before navigation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Then navigate
    router.push(path);
  };

  const scrollToTop = () => {
    const el = document.getElementById("app-scroll");
    if (el) {
      el.scrollTop = 0;
    } else {
      // Try scrolling to header first
      const header = document.querySelector('header') || document.querySelector('[role="banner"]');
      if (header) {
        header.scrollIntoView({
          behavior: 'auto',
          block: 'start',
          inline: 'nearest'
        });
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    }
  };

  return { navigateToTop, scrollToTop };
};
