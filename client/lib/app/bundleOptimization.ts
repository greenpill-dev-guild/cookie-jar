"use client";

import React, { lazy, ComponentType, LazyExoticComponent } from 'react';
import dynamic from 'next/dynamic';

/**
 * Bundle analysis and optimization utilities
 */

// Dynamic import wrapper with better error handling
export function createLazyComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options?: {
    loading?: ComponentType;
    error?: ComponentType<{ error: Error; retry: () => void }>;
    timeout?: number;
    retryCount?: number;
  }
): LazyExoticComponent<T> {
  const { timeout = 10000, retryCount = 3 } = options || {};

  return lazy(() => {
    let attempts = 0;

    const loadWithRetry = async (): Promise<{ default: T }> => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Component load timeout')), timeout);
        });

        const componentModule = await Promise.race([factory(), timeoutPromise]);
        return componentModule;
      } catch (error) {
        attempts++;
        
        if (attempts <= retryCount) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Failed to load component (attempt ${attempts}/${retryCount + 1}):`, error);
          }
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts - 1) * 1000));
          return loadWithRetry();
        }
        
        throw error;
      }
    };

    return loadWithRetry();
  });
}

// Next.js dynamic import wrapper with SSR handling
export function createDynamicComponent<T = {}>(
  factory: () => Promise<ComponentType<T>>,
  options?: {
    ssr?: boolean;
    loading?: () => React.ReactNode;
  }
) {
  return dynamic(factory, {
    ssr: options?.ssr ?? false,
    loading: options?.loading,
  });
}

// Code splitting utilities for large libraries
export const LazyLibraries = {
  // Charts
  Recharts: createLazyComponent(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer }))),
  
  // Framer Motion
  FramerMotion: createLazyComponent(() => import('framer-motion').then(mod => ({ default: mod.motion.div }))),
  
  // Canvas Confetti
  CanvasConfetti: createLazyComponent(() => import('canvas-confetti')),
  
  // React Window (for virtualization)
  ReactWindow: createLazyComponent(() => import('react-window').then(mod => ({ default: mod.FixedSizeList }))),
};

// Tree-shaking optimization helpers
export const OptimizedImports = {
  // Lodash - import only what we need
  debounce: () => import('lodash/debounce'),
  throttle: () => import('lodash/throttle'),
  cloneDeep: () => import('lodash/cloneDeep'),
  
  // Date-fns - import only specific functions
  formatDistanceToNow: () => import('date-fns/formatDistanceToNow'),
  format: () => import('date-fns/format'),
  parseISO: () => import('date-fns/parseISO'),
  
  // Crypto utilities
  keccak256: () => import('viem').then(mod => ({ keccak256: mod.keccak256 })),
  toHex: () => import('viem').then(mod => ({ toHex: mod.toHex })),
};

// Bundle size monitoring
export class BundleMonitor {
  private static instance: BundleMonitor;
  private loadTimes: Map<string, number> = new Map();
  private chunkSizes: Map<string, number> = new Map();

  static getInstance(): BundleMonitor {
    if (!BundleMonitor.instance) {
      BundleMonitor.instance = new BundleMonitor();
    }
    return BundleMonitor.instance;
  }

  trackChunkLoad(chunkName: string, startTime: number) {
    const loadTime = Date.now() - startTime;
    this.loadTimes.set(chunkName, loadTime);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📦 Chunk loaded: ${chunkName} (${loadTime}ms)`);
      
      if (loadTime > 3000) {
        console.warn(`🐌 Slow chunk: ${chunkName} took ${loadTime}ms to load`);
      }
    }
  }

  getLoadStats() {
    return {
      averageLoadTime: Array.from(this.loadTimes.values()).reduce((a, b) => a + b, 0) / this.loadTimes.size,
      slowestChunks: Array.from(this.loadTimes.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      totalChunks: this.loadTimes.size,
    };
  }

  reportStats() {
    if (process.env.NODE_ENV === 'development') {
      const stats = this.getLoadStats();
      console.group('📊 Bundle Load Statistics');
      console.log('Average load time:', stats.averageLoadTime.toFixed(2), 'ms');
      console.log('Total chunks loaded:', stats.totalChunks);
      console.log('Slowest chunks:', stats.slowestChunks);
      console.groupEnd();
    }
  }
}

// Performance-optimized component wrapper
export function withBundleOptimization<P extends object>(
  Component: ComponentType<P>,
  options?: {
    preload?: boolean;
    criticalResource?: boolean;
  }
) {
  const { preload = false, criticalResource = false } = options || {};
  
  return function OptimizedComponent(props: P) {
    // Preload related chunks if specified
    React.useEffect(() => {
      if (preload && !criticalResource) {
        // Preload in next tick to not block initial render
        setTimeout(() => {
          // Trigger component mount to load its chunks
        }, 0);
      }
    }, []);

    return React.createElement(Component, props);
  };
}

// Webpack bundle analyzer helper (development only)
export function analyzeBundleSize() {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Bundle analysis is only available in development mode');
    return;
  }

  // This would integrate with webpack-bundle-analyzer
  console.log('To analyze bundle size, run: npm run build:analyze');
  console.log('This will open an interactive bundle size visualization');
}

// Resource hints for critical resources
export function addResourceHints() {
  if (typeof document === 'undefined') return;

  // Preload critical fonts
  const fontPreload = document.createElement('link');
  fontPreload.rel = 'preload';
  fontPreload.href = '/fonts/ClashDisplay.ttf';
  fontPreload.as = 'font';
  fontPreload.type = 'font/ttf';
  fontPreload.crossOrigin = 'anonymous';
  document.head.appendChild(fontPreload);

  // DNS prefetch for external resources
  const dnsPrefetch = [
    'https://eth-mainnet.g.alchemy.com',
    'https://base-mainnet.g.alchemy.com',
    'https://api.opensea.io',
  ];

  dnsPrefetch.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  });
}

// Critical CSS extraction helper
export function inlineCriticalCSS(css: string) {
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = css;
  style.dataset.critical = 'true';
  document.head.appendChild(style);
}

// Service Worker for caching optimization
export function registerServiceWorker() {
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    process.env.NODE_ENV === 'production'
  ) {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  }
}

// Bundle size checker
export async function checkBundleSize() {
  if (process.env.NODE_ENV !== 'development') return;

  try {
    const response = await fetch('/api/bundle-stats');
    const stats = await response.json();
    
    console.group('📦 Bundle Size Analysis');
    console.log('Main bundle:', formatBytes(stats.main?.size || 0));
    console.log('Total JavaScript:', formatBytes(stats.totalJS || 0));
    console.log('Total CSS:', formatBytes(stats.totalCSS || 0));
    console.log('Chunk count:', stats.chunkCount || 0);
    
    if (stats.largeChunks?.length > 0) {
      console.warn('Large chunks detected:', stats.largeChunks);
    }
    
    console.groupEnd();
  } catch (error) {
    console.warn('Failed to fetch bundle stats:', error);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// React hook for bundle optimization
export function useBundleOptimization() {
  const monitor = BundleMonitor.getInstance();
  
  React.useEffect(() => {
    // Add resource hints on mount
    addResourceHints();
    
    // Check bundle size in development
    if (process.env.NODE_ENV === 'development') {
      checkBundleSize();
    }
    
    // Report stats after initial load
    const timer = setTimeout(() => {
      monitor.reportStats();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return {
    analyzeBundleSize,
    checkBundleSize,
    getLoadStats: () => monitor.getLoadStats(),
  };
}
