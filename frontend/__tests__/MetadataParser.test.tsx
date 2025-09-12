import React from 'react'
import { render, screen } from '@testing-library/react'

// MetadataParser utility (inline for testing)
const parseMetadata = (metadataString: string | undefined) => {
  if (!metadataString) return { name: "Cookie Jar", description: "", image: "", link: "" }
  
  try {
    const parsed = JSON.parse(metadataString)
    return {
      name: parsed.name || "Cookie Jar",
      description: parsed.description || metadataString, // fallback to raw string
      image: parsed.image || "",
      link: parsed.link || ""
    }
  } catch {
    // If not JSON, treat as legacy description-only metadata
    return {
      name: metadataString || "Cookie Jar",
      description: "",
      image: "",
      link: ""
    }
  }
}

// Test component that uses the parser
const MetadataTest: React.FC<{ metadata?: string }> = ({ metadata }) => {
  const parsed = parseMetadata(metadata)
  return (
    <div>
      <h1 data-testid="name">{parsed.name}</h1>
      <p data-testid="description">{parsed.description}</p>
      <img data-testid="image" src={parsed.image} alt="" />
      <a data-testid="link" href={parsed.link}>Link</a>
    </div>
  )
}

describe('parseMetadata', () => {
  it('returns default values for undefined metadata', () => {
    render(<MetadataTest />)
    expect(screen.getByTestId('name')).toHaveTextContent('Cookie Jar')
    expect(screen.getByTestId('description')).toHaveTextContent('')
    expect(screen.getByTestId('image')).toHaveAttribute('src', '')
    expect(screen.getByTestId('link')).toHaveAttribute('href', '')
  })

  it('returns default values for empty metadata', () => {
    render(<MetadataTest metadata="" />)
    expect(screen.getByTestId('name')).toHaveTextContent('Cookie Jar')
    expect(screen.getByTestId('description')).toHaveTextContent('')
    expect(screen.getByTestId('image')).toHaveAttribute('src', '')
    expect(screen.getByTestId('link')).toHaveAttribute('href', '')
  })

  it('parses valid JSON metadata correctly', () => {
    const metadata = JSON.stringify({
      name: 'My Special Jar',
      description: 'A detailed description',
      image: 'https://example.com/image.png',
      link: 'https://example.com/project'
    })

    render(<MetadataTest metadata={metadata} />)
    expect(screen.getByTestId('name')).toHaveTextContent('My Special Jar')
    expect(screen.getByTestId('description')).toHaveTextContent('A detailed description')
    expect(screen.getByTestId('image')).toHaveAttribute('src', 'https://example.com/image.png')
    expect(screen.getByTestId('link')).toHaveAttribute('href', 'https://example.com/project')
  })

  it('handles partial JSON metadata', () => {
    const metadata = JSON.stringify({
      name: 'Partial Jar',
      image: 'https://example.com/image.png'
      // missing description and link
    })

    render(<MetadataTest metadata={metadata} />)
    expect(screen.getByTestId('name')).toHaveTextContent('Partial Jar')
    expect(screen.getByTestId('description')).toHaveTextContent(metadata) // fallback to raw string
    expect(screen.getByTestId('image')).toHaveAttribute('src', 'https://example.com/image.png')
    expect(screen.getByTestId('link')).toHaveAttribute('href', '')
  })

  it('handles JSON with empty name', () => {
    const metadata = JSON.stringify({
      name: '',
      description: 'Description only'
    })

    render(<MetadataTest metadata={metadata} />)
    expect(screen.getByTestId('name')).toHaveTextContent('Cookie Jar') // fallback to default
    expect(screen.getByTestId('description')).toHaveTextContent('Description only')
  })

  it('handles legacy string metadata', () => {
    const metadata = 'Legacy string description'

    render(<MetadataTest metadata={metadata} />)
    expect(screen.getByTestId('name')).toHaveTextContent('Legacy string description')
    expect(screen.getByTestId('description')).toHaveTextContent('')
    expect(screen.getByTestId('image')).toHaveAttribute('src', '')
    expect(screen.getByTestId('link')).toHaveAttribute('href', '')
  })

  it('handles malformed JSON as legacy string', () => {
    const metadata = '{"name": "Invalid JSON" missing bracket'

    render(<MetadataTest metadata={metadata} />)
    expect(screen.getByTestId('name')).toHaveTextContent(metadata)
    expect(screen.getByTestId('description')).toHaveTextContent('')
    expect(screen.getByTestId('image')).toHaveAttribute('src', '')
    expect(screen.getByTestId('link')).toHaveAttribute('href', '')
  })

  it('preserves all fields when all are provided', () => {
    const metadata = JSON.stringify({
      name: 'Complete Jar',
      description: 'Full description',
      image: 'https://example.com/complete.png',
      link: 'https://complete-project.com',
      extraField: 'ignored' // extra fields should not break parsing
    })

    render(<MetadataTest metadata={metadata} />)
    expect(screen.getByTestId('name')).toHaveTextContent('Complete Jar')
    expect(screen.getByTestId('description')).toHaveTextContent('Full description')
    expect(screen.getByTestId('image')).toHaveAttribute('src', 'https://example.com/complete.png')
    expect(screen.getByTestId('link')).toHaveAttribute('href', 'https://complete-project.com')
  })
})