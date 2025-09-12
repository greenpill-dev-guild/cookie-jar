import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the complete create form logic
const CreateFormLogic = () => {
  const [jarName, setJarName] = React.useState('')
  const [imageUrl, setImageUrl] = React.useState('')
  const [externalLink, setExternalLink] = React.useState('')
  const [metadata, setMetadata] = React.useState('')
  const [customFee, setCustomFee] = React.useState('')
  const [enableCustomFee, setEnableCustomFee] = React.useState(false)

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!jarName || jarName.length < 3) {
      errors.jarName = 'Jar name must be at least 3 characters'
    }
    
    if (imageUrl && !isValidUrl(imageUrl)) {
      errors.imageUrl = 'Please enter a valid URL'
    }
    
    if (externalLink && !isValidUrl(externalLink)) {
      errors.externalLink = 'Please enter a valid URL'
    }
    
    if (!metadata || metadata.length < 10) {
      errors.metadata = 'Description must be at least 10 characters'
    }
    
    if (enableCustomFee) {
      if (!customFee) {
        errors.customFee = 'Please enter a custom fee percentage'
      } else {
        const feeValue = parseFloat(customFee)
        if (isNaN(feeValue) || feeValue < 0 || feeValue > 100) {
          errors.customFee = 'Fee percentage must be between 0 and 100'
        }
      }
    }
    
    return { isValid: Object.keys(errors).length === 0, errors }
  }

  const createMetadataJson = () => {
    return JSON.stringify({
      name: jarName,
      description: metadata,
      image: imageUrl,
      link: externalLink
    })
  }

  const { isValid, errors } = validateForm()

  return (
    <div data-testid="create-form">
      <input
        data-testid="jar-name"
        value={jarName}
        onChange={(e) => setJarName(e.target.value)}
        placeholder="Jar Name"
      />
      {errors.jarName && <div data-testid="jar-name-error">{errors.jarName}</div>}
      
      <input
        data-testid="image-url"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Image URL"
      />
      {errors.imageUrl && <div data-testid="image-url-error">{errors.imageUrl}</div>}
      
      <input
        data-testid="external-link"
        value={externalLink}
        onChange={(e) => setExternalLink(e.target.value)}
        placeholder="External Link"
      />
      {errors.externalLink && <div data-testid="external-link-error">{errors.externalLink}</div>}
      
      <textarea
        data-testid="description"
        value={metadata}
        onChange={(e) => setMetadata(e.target.value)}
        placeholder="Description"
      />
      {errors.metadata && <div data-testid="description-error">{errors.metadata}</div>}
      
      <label>
        <input
          type="checkbox"
          data-testid="enable-custom-fee"
          checked={enableCustomFee}
          onChange={(e) => setEnableCustomFee(e.target.checked)}
        />
        Enable Custom Fee
      </label>
      
      {enableCustomFee && (
        <>
          <input
            data-testid="custom-fee"
            value={customFee}
            onChange={(e) => setCustomFee(e.target.value)}
            placeholder="Custom Fee %"
          />
          {errors.customFee && <div data-testid="custom-fee-error">{errors.customFee}</div>}
        </>
      )}
      
      <button data-testid="submit" disabled={!isValid}>
        Create Jar
      </button>
      
      <div data-testid="metadata-json" style={{ display: 'none' }}>
        {createMetadataJson()}
      </div>
      
      <div data-testid="form-valid">{isValid ? 'valid' : 'invalid'}</div>
    </div>
  )
}

describe('Create Form Integration', () => {
  const user = userEvent.setup()

  it('validates complete form correctly', async () => {
    render(<CreateFormLogic />)
    
    // Fill out valid form
    await user.type(screen.getByTestId('jar-name'), 'My Test Jar')
    await user.type(screen.getByTestId('image-url'), 'https://example.com/image.png')
    await user.type(screen.getByTestId('external-link'), 'https://myproject.com')
    await user.type(screen.getByTestId('description'), 'This is a comprehensive test description')
    
    await waitFor(() => {
      expect(screen.getByTestId('form-valid')).toHaveTextContent('valid')
    })
    
    expect(screen.getByTestId('submit')).not.toBeDisabled()
  })

  it('shows validation errors for invalid inputs', async () => {
    render(<CreateFormLogic />)
    
    // Fill out invalid form
    await user.type(screen.getByTestId('jar-name'), 'Hi') // too short
    await user.type(screen.getByTestId('image-url'), 'not-a-url') // invalid URL
    await user.type(screen.getByTestId('external-link'), 'also-invalid') // invalid URL
    await user.type(screen.getByTestId('description'), 'short') // too short
    
    await waitFor(() => {
      expect(screen.getByTestId('jar-name-error')).toHaveTextContent('Jar name must be at least 3 characters')
      expect(screen.getByTestId('image-url-error')).toHaveTextContent('Please enter a valid URL')
      expect(screen.getByTestId('external-link-error')).toHaveTextContent('Please enter a valid URL')
      expect(screen.getByTestId('description-error')).toHaveTextContent('Description must be at least 10 characters')
    })
    
    expect(screen.getByTestId('submit')).toBeDisabled()
  })

  it('handles custom fee validation', async () => {
    render(<CreateFormLogic />)
    
    // Fill required fields first
    await user.type(screen.getByTestId('jar-name'), 'Test Jar')
    await user.type(screen.getByTestId('description'), 'Valid description with enough characters')
    
    // Enable custom fee
    await user.click(screen.getByTestId('enable-custom-fee'))
    
    expect(screen.getByTestId('custom-fee')).toBeInTheDocument()
    
    // Test invalid fee
    await user.type(screen.getByTestId('custom-fee'), '150')
    
    await waitFor(() => {
      expect(screen.getByTestId('custom-fee-error')).toHaveTextContent('Fee percentage must be between 0 and 100')
    })
    
    expect(screen.getByTestId('submit')).toBeDisabled()
    
    // Fix the fee
    await user.clear(screen.getByTestId('custom-fee'))
    await user.type(screen.getByTestId('custom-fee'), '5.5')
    
    await waitFor(() => {
      expect(screen.queryByTestId('custom-fee-error')).not.toBeInTheDocument()
      expect(screen.getByTestId('form-valid')).toHaveTextContent('valid')
    })
  })

  it('creates correct JSON metadata', async () => {
    render(<CreateFormLogic />)
    
    await user.type(screen.getByTestId('jar-name'), 'My Special Jar')
    await user.type(screen.getByTestId('image-url'), 'https://example.com/special.png')
    await user.type(screen.getByTestId('external-link'), 'https://special-project.com')
    await user.type(screen.getByTestId('description'), 'A very special jar for testing purposes')
    
    await waitFor(() => {
      const metadataJson = screen.getByTestId('metadata-json').textContent
      const parsed = JSON.parse(metadataJson || '{}')
      
      expect(parsed.name).toBe('My Special Jar')
      expect(parsed.description).toBe('A very special jar for testing purposes')
      expect(parsed.image).toBe('https://example.com/special.png')
      expect(parsed.link).toBe('https://special-project.com')
    })
  })

  it('handles optional fields correctly', async () => {
    render(<CreateFormLogic />)
    
    // Only fill required fields
    await user.type(screen.getByTestId('jar-name'), 'Minimal Jar')
    await user.type(screen.getByTestId('description'), 'Just the required description')
    
    await waitFor(() => {
      expect(screen.getByTestId('form-valid')).toHaveTextContent('valid')
      
      const metadataJson = screen.getByTestId('metadata-json').textContent
      const parsed = JSON.parse(metadataJson || '{}')
      
      expect(parsed.name).toBe('Minimal Jar')
      expect(parsed.description).toBe('Just the required description')
      expect(parsed.image).toBe('')
      expect(parsed.link).toBe('')
    })
  })

  it('disables custom fee fields when checkbox is unchecked', async () => {
    render(<CreateFormLogic />)
    
    // Enable then disable custom fee
    await user.click(screen.getByTestId('enable-custom-fee'))
    expect(screen.getByTestId('custom-fee')).toBeInTheDocument()
    
    await user.click(screen.getByTestId('enable-custom-fee'))
    expect(screen.queryByTestId('custom-fee')).not.toBeInTheDocument()
  })

  it('clears custom fee errors when disabled', async () => {
    render(<CreateFormLogic />)
    
    // Fill required fields
    await user.type(screen.getByTestId('jar-name'), 'Test Jar')
    await user.type(screen.getByTestId('description'), 'Valid description')
    
    // Enable custom fee and enter invalid value
    await user.click(screen.getByTestId('enable-custom-fee'))
    await user.type(screen.getByTestId('custom-fee'), '150')
    
    await waitFor(() => {
      expect(screen.getByTestId('custom-fee-error')).toBeInTheDocument()
    })
    
    // Disable custom fee
    await user.click(screen.getByTestId('enable-custom-fee'))
    
    await waitFor(() => {
      expect(screen.queryByTestId('custom-fee-error')).not.toBeInTheDocument()
      expect(screen.getByTestId('form-valid')).toHaveTextContent('valid')
    })
  })
})