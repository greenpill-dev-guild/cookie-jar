/**
 * Protocol Components with Error Boundaries
 *
 * This file exports protocol components wrapped with appropriate error boundaries
 * for better error handling and user experience.
 */

import { withProtocolErrorBoundary } from "@/components/app/ProtocolErrorBoundary";
import { POAPConfig as _POAPConfig } from "./protocols/POAPConfig";
import { UnlockConfig as _UnlockConfig } from "./protocols/UnlockConfig";
import { UnlockMembershipStatus as _UnlockMembershipStatus } from "./UnlockMembershipStatus";
import { HypercertConfig as _HypercertConfig } from "./protocols/HypercertConfig";
import { HatsConfig as _HatsConfig } from "./protocols/HatsConfig";
import { ProtocolSelector as _ProtocolSelector } from "./ProtocolSelector";

// Wrapped components with error boundaries
export const POAPConfig = withProtocolErrorBoundary(_POAPConfig, {
  protocolName: "POAP",
  maxRetries: 2,
  showDetails: process.env.NODE_ENV === "development",
});

export const UnlockConfig = withProtocolErrorBoundary(_UnlockConfig, {
  protocolName: "Unlock Protocol",
  maxRetries: 2,
  showDetails: process.env.NODE_ENV === "development",
});

export const UnlockMembershipStatus = withProtocolErrorBoundary(
  _UnlockMembershipStatus,
  {
    protocolName: "Unlock Protocol Status",
    maxRetries: 3,
    showDetails: process.env.NODE_ENV === "development",
  },
);

export const HypercertConfig = withProtocolErrorBoundary(
  _HypercertConfig,
  {
    protocolName: "Hypercerts",
    maxRetries: 2,
    showDetails: process.env.NODE_ENV === "development",
  },
);

export const HatsConfig = withProtocolErrorBoundary(_HatsConfig, {
  protocolName: "Hats Protocol",
  maxRetries: 2,
  showDetails: process.env.NODE_ENV === "development",
});

export const ProtocolSelector = withProtocolErrorBoundary(
  _ProtocolSelector,
  {
    protocolName: "Protocol Selector",
    maxRetries: 1,
    showDetails: process.env.NODE_ENV === "development",
  },
);

// Re-export the original components for cases where error boundaries aren't needed
export {
  _POAPConfig as POAPConfigUnsafe,
  _UnlockConfig as UnlockConfigUnsafe,
  _UnlockMembershipStatus as UnlockMembershipStatusUnsafe,
  _HypercertConfig as HypercertConfigUnsafe,
  _HatsConfig as HatsConfigUnsafe,
  _ProtocolSelector as ProtocolSelectorUnsafe,
};

// Export error boundary components
export {
  ProtocolErrorBoundary,
  useProtocolErrorBoundary,
} from "@/components/app/ProtocolErrorBoundary";
