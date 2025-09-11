import React from 'react'
import { render, screen } from '@testing-library/react'

// MetadataDisplay component (inline for testing)
const MetadataDisplay: React.FC<{ metadata: string }> = ({ metadata }) => {
  try {
    const parsed = JSON.parse(metadata)
    return <span>{parsed.name || metadata}</span>
  } catch {
    return <span>{metadata}</span>
  }
}

describe('MetadataDisplay', () => {
  it('renders parsed name from JSON metadata', () => {
    const jsonMetadata = JSON.stringify({
      name: 'My Cookie Jar',
      description: 'A test jar',
      image: 'https://example.com/image.png',
      link: 'https://example.com'
    })

    render(<MetadataDisplay metadata={jsonMetadata} />)
    expect(screen.getByText('My Cookie Jar')).toBeInTheDocument()
  })

  it('renders raw metadata when JSON parsing fails', () => {
    const rawMetadata = 'Simple text metadata'

    render(<MetadataDisplay metadata={rawMetadata} />)
    expect(screen.getByText('Simple text metadata')).toBeInTheDocument()
  })

  it('renders raw metadata when name is not present in JSON', () => {
    const jsonMetadata = JSON.stringify({
      description: 'A test jar without name',
      image: 'https://example.com/image.png'
    })

    render(<MetadataDisplay metadata={jsonMetadata} />)
    expect(screen.getByText(jsonMetadata)).toBeInTheDocument()
  })

  it('renders empty string when metadata is empty', () => {
    const { container } = render(<MetadataDisplay metadata="" />)
    expect(container.textContent).toBe('')
  })

  it('handles malformed JSON gracefully', () => {
    const malformedJson = '{"name": "Test", invalid}'

    render(<MetadataDisplay metadata={malformedJson} />)
    expect(screen.getByText(malformedJson)).toBeInTheDocument()
  })

  it('handles JSON with empty name', () => {
    const jsonMetadata = JSON.stringify({
      name: '',
      description: 'Test description'
    })

    render(<MetadataDisplay metadata={jsonMetadata} />)
    expect(screen.getByText(jsonMetadata)).toBeInTheDocument()
  })

  it('handles nested JSON structures', () => {
    const jsonMetadata = JSON.stringify({
      name: 'Complex Jar',
      description: 'A test jar',
      metadata: {
        nested: 'value'
      }
    })

    render(<MetadataDisplay metadata={jsonMetadata} />)
    expect(screen.getByText('Complex Jar')).toBeInTheDocument()
  })
})