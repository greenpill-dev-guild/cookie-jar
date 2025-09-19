/**
 * Protocol Components with Error Boundaries
 * 
 * This file exports protocol components wrapped with appropriate error boundaries
 * for better error handling and user experience.
 */

import { withProtocolErrorBoundary } from '@/components/design/protocol-error-boundary'
import { POAPGateConfig as _POAPGateConfig } from './POAPGateConfig'
import { UnlockGateConfig as _UnlockGateConfig } from './UnlockGateConfig'
import { UnlockMembershipStatus as _UnlockMembershipStatus } from './UnlockMembershipStatus'
import { HypercertGateConfig as _HypercertGateConfig } from './HypercertGateConfig'
import { HatsGateConfig as _HatsGateConfig } from './HatsGateConfig'
import { ProtocolGateSelector as _ProtocolGateSelector } from './ProtocolGateSelector'

// Wrapped components with error boundaries
export const POAPGateConfig = withProtocolErrorBoundary(_POAPGateConfig, {
  protocolName: 'POAP',
  maxRetries: 2,
  showDetails: process.env.NODE_ENV === 'development'
})

export const UnlockGateConfig = withProtocolErrorBoundary(_UnlockGateConfig, {
  protocolName: 'Unlock Protocol',
  maxRetries: 2,
  showDetails: process.env.NODE_ENV === 'development'
})

export const UnlockMembershipStatus = withProtocolErrorBoundary(_UnlockMembershipStatus, {
  protocolName: 'Unlock Protocol Status',
  maxRetries: 3,
  showDetails: process.env.NODE_ENV === 'development'
})

export const HypercertGateConfig = withProtocolErrorBoundary(_HypercertGateConfig, {
  protocolName: 'Hypercerts',
  maxRetries: 2,
  showDetails: process.env.NODE_ENV === 'development'
})

export const HatsGateConfig = withProtocolErrorBoundary(_HatsGateConfig, {
  protocolName: 'Hats Protocol',
  maxRetries: 2,
  showDetails: process.env.NODE_ENV === 'development'
})

export const ProtocolGateSelector = withProtocolErrorBoundary(_ProtocolGateSelector, {
  protocolName: 'Protocol Selector',
  maxRetries: 1,
  showDetails: process.env.NODE_ENV === 'development'
})


// Re-export the original components for cases where error boundaries aren't needed
export { 
  _POAPGateConfig as POAPGateConfigUnsafe,
  _UnlockGateConfig as UnlockGateConfigUnsafe,
  _UnlockMembershipStatus as UnlockMembershipStatusUnsafe,
  _HypercertGateConfig as HypercertGateConfigUnsafe,
  _HatsGateConfig as HatsGateConfigUnsafe,
  _ProtocolGateSelector as ProtocolGateSelectorUnsafe,
}

// Export error boundary components
export { ProtocolErrorBoundary, useProtocolErrorBoundary } from '@/components/design/protocol-error-boundary'
