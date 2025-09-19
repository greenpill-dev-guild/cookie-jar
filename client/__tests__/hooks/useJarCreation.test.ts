import '@testing-library/jest-dom'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useJarCreation, AccessType, WithdrawalTypeOptions } from '@/hooks/useJarCreation'

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ 
    isConnected: true,
    address: '0x1234567890123456789012345678901234567890' 
  })),
  useChainId: jest.fn(() => 8453), // Base mainnet (v1)
  useWriteContract: jest.fn(() => ({
    writeContract: jest.fn(),
    data: '0xabcdef',
    error: null,
    isPending: false
  })),
  useWaitForTransactionReceipt: jest.fn(() => ({
    isLoading: false,
    isSuccess: false,
    data: null
  }))
}))

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}))

// Mock config
jest.mock('@/config/supported-networks', () => ({
  contractAddresses: {
    cookieJarFactory: {
      8453: '0x86dBf7076202FDf89792038B97e41aC8A4A8Bef9', // Base
      31337: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'  // Anvil
    }
  },
  isV2Chain: jest.fn((chainId: number) => chainId === 31337)
}))

// Mock toast
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

describe('useJarCreation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('🔧 ETH Address Fix', () => {
    it('should use address(3) for ETH address', () => {
      const { result } = renderHook(() => useJarCreation())
      
      expect(result.current.ETH_ADDRESS).toBe('0x0000000000000000000000000000000000000003')
    })

    it('should initialize supportedCurrency with correct ETH address', () => {
      const { result } = renderHook(() => useJarCreation())
      
      expect(result.current.supportedCurrency).toBe('0x0000000000000000000000000000000000000003')
    })
  })

  describe('🚀 V1 vs V2 Logic', () => {
    it('should detect v1 contracts correctly', () => {
      const { result } = renderHook(() => useJarCreation())
      
      // Base mainnet should be v1
      expect(result.current.isV2Contract).toBe(false)
    })

    it('should detect v2 contracts correctly', () => {
      const { isV2Chain } = require('@/config/supported-networks')
      isV2Chain.mockReturnValue(true)
      
      const { result } = renderHook(() => useJarCreation())
      
      expect(result.current.isV2Contract).toBe(true)
    })

    it('should disable custom fees for v1 contracts', () => {
      const { result } = renderHook(() => useJarCreation())
      
      act(() => {
        result.current.setEnableCustomFee(true)
      })

      // Should automatically disable custom fees for v1
      expect(result.current.enableCustomFee).toBe(false)
    })

    it('should force allowlist access type for v1 contracts', () => {
      const { result } = renderHook(() => useJarCreation())
      
      act(() => {
        result.current.setAccessType(AccessType.NFTGated)
      })

      // Should automatically revert to allowlist for v1
      expect(result.current.accessType).toBe(AccessType.Allowlist)
    })
  })

  describe('📝 Form Validation', () => {
    it('should validate required jar name', () => {
      const { result } = renderHook(() => useJarCreation())
      
      const validation = result.current.validateStep1()
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Jar name is required')
    })

    it('should validate withdrawal amounts', () => {
      const { result } = renderHook(() => useJarCreation())
      
      act(() => {
        result.current.setWithdrawalOption(WithdrawalTypeOptions.Fixed)
        result.current.setFixedAmount('0')
      })

      const validation = result.current.validateStep2()
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Fixed withdrawal amount must be greater than 0')
    })

    it('should validate withdrawal interval', () => {
      const { result } = renderHook(() => useJarCreation())
      
      act(() => {
        result.current.setWithdrawalInterval('0')
      })

      const validation = result.current.validateStep2()
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Withdrawal interval must be greater than 0 days')
    })

    it('should validate custom fee percentage', () => {
      const { result } = renderHook(() => useJarCreation())
      
      act(() => {
        result.current.setEnableCustomFee(true)
        result.current.setCustomFee('150') // Over 100%
      })

      const validation = result.current.validateStep4()
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Custom fee must be between 0 and 100 percent')
    })
  })

  describe('💱 Currency Handling', () => {
    it('should handle custom currency selection', () => {
      const { result } = renderHook(() => useJarCreation())
      
      act(() => {
        result.current.handleCurrencyChange('CUSTOM')
      })
      
      expect(result.current.showCustomCurrency).toBe(true)
    })

    it('should validate ERC20 addresses', async () => {
      const { result } = renderHook(() => useJarCreation())
      
      act(() => {
        result.current.setCustomCurrencyAddress('0x1234567890123456789012345678901234567890')
      })
      
      await act(async () => {
        await result.current.handleCustomCurrencySubmit()
      })
      
      expect(result.current.supportedCurrency).toBe('0x1234567890123456789012345678901234567890')
    })
  })

  describe('🧹 Form Reset', () => {
    it('should reset all form fields', () => {
      const { result } = renderHook(() => useJarCreation())
      
      // Set some values
      act(() => {
        result.current.setJarName('Test Jar')
        result.current.setFixedAmount('0.5')
        result.current.setEnableCustomFee(true)
      })
      
      // Reset form
      act(() => {
        result.current.resetForm()
      })
      
      expect(result.current.jarName).toBe('')
      expect(result.current.fixedAmount).toBe('0')
      expect(result.current.enableCustomFee).toBe(false)
      expect(result.current.supportedCurrency).toBe('0x0000000000000000000000000000000000000003')
    })
  })

  describe('🎲 Development Helpers', () => {
    beforeEach(() => {
      // Mock NODE_ENV for these tests
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      return () => {
        process.env.NODE_ENV = originalEnv
      }
    })

    it('should populate random data in development', () => {
      const { result } = renderHook(() => useJarCreation())
      
      act(() => {
        result.current.prepopulateRandomData()
      })
      
      expect(result.current.jarName).toBeTruthy()
      expect(result.current.metadata).toBeTruthy()
      expect(parseFloat(result.current.fixedAmount)).toBeGreaterThan(0.01)
      expect(parseInt(result.current.withdrawalInterval)).toBeGreaterThan(0)
    })
  })
})
