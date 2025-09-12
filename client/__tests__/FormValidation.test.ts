// Test for the form validation logic used in create page

describe('Form Validation Utils', () => {
  // URL validation helper
  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Metadata validation
  const validateMetadata = (metadata: string) => {
    const errors: Record<string, string> = {}
    
    if (!metadata) {
      errors.metadata = "Description is required"
    } else if (metadata.length < 10) {
      errors.metadata = `Description must be at least 10 characters (${metadata.length}/10)`
    }
    
    return { isValid: Object.keys(errors).length === 0, errors }
  }

  // Jar name validation
  const validateJarName = (jarName: string) => {
    const errors: Record<string, string> = {}
    
    if (!jarName) {
      errors.jarName = "Jar name is required"
    } else if (jarName.length < 3) {
      errors.jarName = `Jar name must be at least 3 characters (${jarName.length}/3)`
    }
    
    return { isValid: Object.keys(errors).length === 0, errors }
  }

  // Custom fee validation
  const validateCustomFee = (customFee: string, enableCustomFee: boolean) => {
    const errors: Record<string, string> = {}
    
    if (enableCustomFee) {
      if (!customFee || customFee === "") {
        errors.customFee = "Please enter a custom fee percentage"
      } else {
        const feeValue = parseFloat(customFee)
        if (isNaN(feeValue) || feeValue < 0 || feeValue > 100) {
          errors.customFee = "Fee percentage must be between 0 and 100"
        }
      }
    }
    
    return { isValid: Object.keys(errors).length === 0, errors }
  }

  describe('isValidUrl', () => {
    it('validates correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://example.com')).toBe(true)
      expect(isValidUrl('https://example.com/path')).toBe(true)
      expect(isValidUrl('https://sub.example.com')).toBe(true)
    })

    it('rejects invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('example.com')).toBe(false)
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl('ftp://example.com')).toBe(true) // technically valid URL
    })

    it('handles edge cases', () => {
      expect(isValidUrl('https://')).toBe(false)
      expect(isValidUrl('https://localhost')).toBe(true)
      expect(isValidUrl('https://192.168.1.1')).toBe(true)
    })
  })

  describe('validateMetadata', () => {
    it('passes valid metadata', () => {
      const result = validateMetadata('This is a valid description with enough characters')
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('fails for empty metadata', () => {
      const result = validateMetadata('')
      expect(result.isValid).toBe(false)
      expect(result.errors.metadata).toBe('Description is required')
    })

    it('fails for too short metadata', () => {
      const result = validateMetadata('short')
      expect(result.isValid).toBe(false)
      expect(result.errors.metadata).toBe('Description must be at least 10 characters (5/10)')
    })

    it('passes exactly 10 characters', () => {
      const result = validateMetadata('1234567890')
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })
  })

  describe('validateJarName', () => {
    it('passes valid jar names', () => {
      const result = validateJarName('My Jar')
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('fails for empty jar name', () => {
      const result = validateJarName('')
      expect(result.isValid).toBe(false)
      expect(result.errors.jarName).toBe('Jar name is required')
    })

    it('fails for too short jar name', () => {
      const result = validateJarName('Hi')
      expect(result.isValid).toBe(false)
      expect(result.errors.jarName).toBe('Jar name must be at least 3 characters (2/3)')
    })

    it('passes exactly 3 characters', () => {
      const result = validateJarName('Jar')
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })
  })

  describe('validateCustomFee', () => {
    it('passes when custom fee is disabled', () => {
      const result = validateCustomFee('', false)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('passes valid custom fee when enabled', () => {
      const result = validateCustomFee('5.5', true)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('fails for empty custom fee when enabled', () => {
      const result = validateCustomFee('', true)
      expect(result.isValid).toBe(false)
      expect(result.errors.customFee).toBe('Please enter a custom fee percentage')
    })

    it('fails for invalid custom fee values', () => {
      expect(validateCustomFee('-1', true).isValid).toBe(false)
      expect(validateCustomFee('101', true).isValid).toBe(false)
      expect(validateCustomFee('abc', true).isValid).toBe(false)
    })

    it('passes boundary values', () => {
      expect(validateCustomFee('0', true).isValid).toBe(true)
      expect(validateCustomFee('100', true).isValid).toBe(true)
      expect(validateCustomFee('0.1', true).isValid).toBe(true)
      expect(validateCustomFee('99.9', true).isValid).toBe(true)
    })
  })

  describe('Integration tests', () => {
    it('validates complete form data', () => {
      const formData = {
        jarName: 'My Cookie Jar',
        metadata: 'This is a comprehensive description of my cookie jar',
        imageUrl: 'https://example.com/image.png',
        externalLink: 'https://myproject.com',
        customFee: '2.5',
        enableCustomFee: true
      }

      const nameResult = validateJarName(formData.jarName)
      const metadataResult = validateMetadata(formData.metadata)
      const feeResult = validateCustomFee(formData.customFee, formData.enableCustomFee)
      const imageValid = !formData.imageUrl || isValidUrl(formData.imageUrl)
      const linkValid = !formData.externalLink || isValidUrl(formData.externalLink)

      expect(nameResult.isValid).toBe(true)
      expect(metadataResult.isValid).toBe(true)
      expect(feeResult.isValid).toBe(true)
      expect(imageValid).toBe(true)
      expect(linkValid).toBe(true)
    })

    it('catches multiple validation errors', () => {
      const formData = {
        jarName: 'Hi', // too short
        metadata: 'short', // too short
        imageUrl: 'not-a-url', // invalid URL
        externalLink: 'also-not-a-url', // invalid URL
        customFee: '150', // too high
        enableCustomFee: true
      }

      const nameResult = validateJarName(formData.jarName)
      const metadataResult = validateMetadata(formData.metadata)
      const feeResult = validateCustomFee(formData.customFee, formData.enableCustomFee)
      const imageValid = !formData.imageUrl || isValidUrl(formData.imageUrl)
      const linkValid = !formData.externalLink || isValidUrl(formData.externalLink)

      expect(nameResult.isValid).toBe(false)
      expect(metadataResult.isValid).toBe(false)
      expect(feeResult.isValid).toBe(false)
      expect(imageValid).toBe(false)
      expect(linkValid).toBe(false)
    })
  })
})