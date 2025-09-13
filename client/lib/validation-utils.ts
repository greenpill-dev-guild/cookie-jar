/**
 * Validation Utilities - Consolidated validation functions
 * 
 * This module contains reusable validation functions that were being
 * duplicated across different components and hooks.
 */

import { isAddress } from 'viem'

/**
 * Common validation functions
 */
export const ValidationUtils = {
  /**
   * Ethereum address validation
   */
  isValidEthereumAddress: (address: string): boolean => {
    return isAddress(address)
  },

  /**
   * POAP event ID validation
   */
  isValidPoapEventId: (eventId: string): boolean => {
    return /^\d+$/.test(eventId) && parseInt(eventId, 10) > 0
  },

  /**
   * Hat ID validation for Hats Protocol
   */
  isValidHatId: (hatId: string): boolean => {
    return /^\d+$/.test(hatId) && parseInt(hatId, 10) > 0
  },

  /**
   * Hypercert token ID validation
   */
  isValidHypercertTokenId: (tokenId: string): boolean => {
    return /^\d+$/.test(tokenId) && parseInt(tokenId, 10) >= 0
  },

  /**
   * Minimum balance validation
   */
  isValidMinBalance: (balance: string): boolean => {
    const num = parseFloat(balance)
    return !isNaN(num) && num > 0
  },

  /**
   * URL validation
   */
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },

  /**
   * Purpose validation (withdrawal purpose)
   */
  isValidPurpose: (purpose: string, minLength: number = 10): boolean => {
    return purpose.trim().length >= minLength
  },

  /**
   * Amount validation (for withdrawals/deposits)
   */
  isValidAmount: (amount: string, min: number = 0): boolean => {
    const num = parseFloat(amount)
    return !isNaN(num) && num > min
  },

  /**
   * Email validation
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  /**
   * Token ID validation (for NFTs)
   */
  isValidTokenId: (tokenId: string): boolean => {
    return /^\d+$/.test(tokenId) && parseInt(tokenId, 10) >= 0
  },

  /**
   * Fee percentage validation (basis points)
   */
  isValidFeePercentage: (fee: string): boolean => {
    const num = parseFloat(fee)
    return !isNaN(num) && num >= 0 && num <= 100
  },

  /**
   * Time interval validation (seconds)
   */
  isValidTimeInterval: (seconds: string): boolean => {
    const num = parseInt(seconds, 10)
    return !isNaN(num) && num >= 0
  }
}

/**
 * Validation rule creators - for use with useFormValidation
 */
export const ValidationRules = {
  required: <T>(message: string = 'This field is required') => ({
    validate: (value: T) => {
      if (typeof value === 'string') return value.trim().length > 0
      if (Array.isArray(value)) return value.length > 0
      return value !== null && value !== undefined
    },
    message
  }),

  minLength: (min: number, message?: string) => ({
    validate: (value: string) => value.trim().length >= min,
    message: message || `Must be at least ${min} characters`
  }),

  maxLength: (max: number, message?: string) => ({
    validate: (value: string) => value.trim().length <= max,
    message: message || `Must not exceed ${max} characters`
  }),

  ethereumAddress: (message: string = 'Must be a valid Ethereum address') => ({
    validate: ValidationUtils.isValidEthereumAddress,
    message
  }),

  positiveNumber: (message: string = 'Must be a positive number') => ({
    validate: (value: string) => ValidationUtils.isValidAmount(value, 0),
    message
  }),

  url: (message: string = 'Must be a valid URL') => ({
    validate: ValidationUtils.isValidUrl,
    message
  }),

  custom: <T>(validator: (value: T) => boolean, message: string) => ({
    validate: validator,
    message
  })
}

/**
 * Protocol-specific validation functions
 */
export const ProtocolValidation = {
  /**
   * Validate POAP configuration
   */
  poap: (eventId: string) => ({
    isValid: ValidationUtils.isValidPoapEventId(eventId),
    error: ValidationUtils.isValidPoapEventId(eventId) ? null : 'Invalid POAP event ID'
  }),

  /**
   * Validate Unlock Protocol configuration
   */
  unlock: (lockAddress: string) => ({
    isValid: ValidationUtils.isValidEthereumAddress(lockAddress),
    error: ValidationUtils.isValidEthereumAddress(lockAddress) ? null : 'Invalid lock address'
  }),

  /**
   * Validate Hypercert configuration
   */
  hypercert: (tokenContract: string, tokenId: string, minBalance: string) => {
    const contractValid = ValidationUtils.isValidEthereumAddress(tokenContract)
    const tokenIdValid = ValidationUtils.isValidHypercertTokenId(tokenId)
    const balanceValid = ValidationUtils.isValidMinBalance(minBalance)

    return {
      isValid: contractValid && tokenIdValid && balanceValid,
      error: !contractValid ? 'Invalid token contract address' :
             !tokenIdValid ? 'Invalid token ID' :
             !balanceValid ? 'Invalid minimum balance' : null
    }
  },

  /**
   * Validate Hats Protocol configuration
   */
  hats: (hatId: string, hatsContract: string) => {
    const hatIdValid = ValidationUtils.isValidHatId(hatId)
    const contractValid = ValidationUtils.isValidEthereumAddress(hatsContract)

    return {
      isValid: hatIdValid && contractValid,
      error: !hatIdValid ? 'Invalid hat ID' :
             !contractValid ? 'Invalid hats contract address' : null
    }
  },

  /**
   * Validate NFT configuration
   */
  nft: (contractAddress: string, tokenId: string) => {
    const addressValid = ValidationUtils.isValidEthereumAddress(contractAddress)
    const tokenIdValid = ValidationUtils.isValidTokenId(tokenId)

    return {
      isValid: addressValid && tokenIdValid,
      error: !addressValid ? 'Invalid contract address' :
             !tokenIdValid ? 'Invalid token ID' : null
    }
  }
}

/**
 * Validation message generators
 */
export const ValidationMessages = {
  required: (fieldName: string) => `${fieldName} is required`,
  invalid: (fieldName: string) => `Invalid ${fieldName}`,
  tooShort: (fieldName: string, minLength: number) => 
    `${fieldName} must be at least ${minLength} characters`,
  tooLong: (fieldName: string, maxLength: number) => 
    `${fieldName} must not exceed ${maxLength} characters`,
  mustBePositive: (fieldName: string) => `${fieldName} must be positive`,
  mustBeAddress: (fieldName: string) => `${fieldName} must be a valid Ethereum address`,
  mustBeUrl: (fieldName: string) => `${fieldName} must be a valid URL`,
  networkError: 'Network error. Please check your connection.',
  walletError: 'Wallet connection error. Please reconnect.',
  protocolError: (protocolName: string) => `${protocolName} error. Please try again.`,
  insufficientBalance: 'Insufficient balance for this operation',
  transactionFailed: 'Transaction failed. Please try again.',
  unauthorized: 'You are not authorized to perform this action',
  notFound: 'Requested resource not found',
  rateLimited: 'Too many requests. Please wait and try again.'
}

/**
 * Validation helpers for specific use cases
 */
export const ValidationHelpers = {
  /**
   * Validate jar creation form
   */
  validateJarCreation: (data: {
    name: string
    description: string
    currency: string
    amount: string
    interval: string
  }) => {
    const errors: Record<string, string> = {}

    if (!ValidationRules.required().validate(data.name)) {
      errors.name = ValidationMessages.required('Name')
    }

    if (!ValidationRules.minLength(10).validate(data.description)) {
      errors.description = ValidationMessages.tooShort('Description', 10)
    }

    if (!ValidationUtils.isValidEthereumAddress(data.currency) && data.currency !== '0x0000000000000000000000000000000000000003') {
      errors.currency = ValidationMessages.mustBeAddress('Currency')
    }

    if (!ValidationUtils.isValidAmount(data.amount)) {
      errors.amount = ValidationMessages.mustBePositive('Amount')
    }

    if (!ValidationUtils.isValidTimeInterval(data.interval)) {
      errors.interval = ValidationMessages.invalid('Withdrawal interval')
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  },

  /**
   * Validate withdrawal form
   */
  validateWithdrawal: (data: {
    amount: string
    purpose?: string
  }, requirePurpose: boolean = false) => {
    const errors: Record<string, string> = {}

    if (!ValidationUtils.isValidAmount(data.amount)) {
      errors.amount = ValidationMessages.mustBePositive('Amount')
    }

    if (requirePurpose && data.purpose && !ValidationUtils.isValidPurpose(data.purpose)) {
      errors.purpose = ValidationMessages.tooShort('Purpose', 10)
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}
