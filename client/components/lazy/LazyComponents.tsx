/**
 * Lazy-loaded components for performance optimization
 * 
 * These components are only loaded when needed, reducing initial bundle size
 * and improving Time to Interactive (TTI) for the main jar viewing experience.
 */

import { lazy, Suspense, useEffect, useRef, useState } from 'react';

// Loading spinner component
const ComponentLoader = ({ name }: { name: string }) => (
  <div className="flex items-center justify-center py-8">
    <div className="text-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ff5e14] mx-auto mb-2"></div>
      <p className="text-sm text-[#8b7355]">Loading {name}...</p>
    </div>
  </div>
);

// ===== STREAMING COMPONENTS =====

export const LazyJarStreamingTab = lazy(() => 
  import('../jar/JarStreamingTab').then(module => ({ 
    default: module.JarStreamingTab 
  }))
);

export const LazyStreamingPanel = lazy(() => 
  import('../jar/StreamingPanel').then(module => ({
    default: module.StreamingPanel
  }))
);

export const LazyTokenRecoveryPanel = lazy(() => 
  import('../jar/TokenRecoveryPanel').then(module => ({
    default: module.TokenRecoveryPanel
  }))
);

// ===== NFT & PROTOCOL COMPONENTS =====

export const LazyProtocolSelector = lazy(() => 
  import('../nft/ProtocolSelector').then(module => ({ 
    default: module.ProtocolSelector 
  }))
);

// TODO: Add these components when they are created
// export const LazyNFTAddressList = lazy(() => 
//   import('../nft/NFTAddressList')
// );

// export const LazyPoapEventSelector = lazy(() => 
//   import('../nft/PoapEventSelector')
// );

// export const LazyHatsSelector = lazy(() => 
//   import('../nft/HatsSelector')
// );

// export const LazyHypercertSelector = lazy(() => 
//   import('../nft/HypercertSelector')
// );

// export const LazyUnlockSelector = lazy(() => 
//   import('../nft/UnlockSelector')
// );

// ===== ADMIN COMPONENTS =====

export const LazyAdminFunctions = lazy(() => 
  import('../jar/AdminFunctions').then(module => ({ 
    default: module.AdminFunctions 
  }))
);

// ===== WRAPPED COMPONENTS WITH LOADING STATES =====

export const JarStreamingTab = (props: any) => (
  <Suspense fallback={<ComponentLoader name="streaming features" />}>
    <LazyJarStreamingTab {...props} />
  </Suspense>
);

export const StreamingPanel = (props: any) => (
  <Suspense fallback={<ComponentLoader name="streaming panel" />}>
    <LazyStreamingPanel {...props} />
  </Suspense>
);

export const TokenRecoveryPanel = (props: any) => (
  <Suspense fallback={<ComponentLoader name="token recovery" />}>
    <LazyTokenRecoveryPanel {...props} />
  </Suspense>
);

export const ProtocolSelector = (props: any) => (
  <Suspense fallback={<ComponentLoader name="protocol selector" />}>
    <LazyProtocolSelector {...props} />
  </Suspense>
);

// TODO: Add these wrapper components when the lazy components are created
// export const NFTAddressList = (props: any) => (
//   <Suspense fallback={<ComponentLoader name="NFT configuration" />}>
//     <LazyNFTAddressList {...props} />
//   </Suspense>
// );

// export const PoapEventSelector = (props: any) => (
//   <Suspense fallback={<ComponentLoader name="POAP selector" />}>
//     <LazyPoapEventSelector {...props} />
//   </Suspense>
// );

// export const HatsSelector = (props: any) => (
//   <Suspense fallback={<ComponentLoader name="Hats selector" />}>
//     <LazyHatsSelector {...props} />
//   </Suspense>
// );

// export const HypercertSelector = (props: any) => (
//   <Suspense fallback={<ComponentLoader name="Hypercert selector" />}>
//     <LazyHypercertSelector {...props} />
//   </Suspense>
// );

// export const UnlockSelector = (props: any) => (
//   <Suspense fallback={<ComponentLoader name="Unlock selector" />}>
//     <LazyUnlockSelector {...props} />
//   </Suspense>
// );

export const AdminFunctions = (props: any) => (
  <Suspense fallback={<ComponentLoader name="admin tools" />}>
    <LazyAdminFunctions {...props} />
  </Suspense>
);

// ===== PERFORMANCE OPTIMIZATION UTILITIES =====

/**
 * Hook to detect if component is in viewport before lazy loading
 * Useful for components that might be below the fold
 */
export const useIntersectionObserver = (
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      options
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options]);

  return isIntersecting;
};

/**
 * Wrapper for lazy loading components only when they come into view
 */
export const LazyOnScroll = ({ 
  children, 
  fallback, 
  rootMargin = '100px' 
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
  rootMargin?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useIntersectionObserver(ref, { rootMargin });

  return (
    <div ref={ref}>
      {isInView ? children : fallback}
    </div>
  );
};
