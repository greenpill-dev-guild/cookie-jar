/**
 * Unified metadata parsing utilities for Cookie Jar
 *
 * Consolidates all metadata parsing logic into a single source of truth.
 * Handles both legacy (string) and v2 (JSON) metadata formats.
 */

export interface ParsedJarMetadata {
  /** Display name of the jar */
  name: string;
  /** Description of the jar's purpose */
  description: string;
  /** URL to jar image/logo */
  image: string;
  /** External link for more information */
  link: string;
  /** Whether this is v2 JSON metadata format */
  isV2Format: boolean;
}

/**
 * Parse raw metadata string into structured object
 *
 * Handles two formats:
 * - v1 (legacy): Plain string (treated as name or description)
 * - v2: JSON object with { name, description, image, link }
 *
 * @param rawMetadata - Raw metadata string from contract
 * @returns Parsed metadata object with defaults for missing fields
 *
 * @example
 * ```typescript
 * // v2 JSON format
 * const parsed = parseJarMetadata('{"name":"My Jar","description":"Test"}');
 * // Returns: { name: "My Jar", description: "Test", image: "", link: "", isV2Format: true }
 *
 * // v1 legacy format
 * const parsed = parseJarMetadata('Old Jar Name');
 * // Returns: { name: "Old Jar Name", description: "", image: "", link: "", isV2Format: false }
 * ```
 */
export function parseJarMetadata(
  rawMetadata: string | undefined
): ParsedJarMetadata {
  const defaultMetadata: ParsedJarMetadata = {
    name: 'Cookie Jar',
    description: '',
    image: '',
    link: '',
    isV2Format: false,
  };

  if (!rawMetadata || rawMetadata.trim() === '') {
    return defaultMetadata;
  }

  try {
    const parsed = JSON.parse(rawMetadata);

    // Validate it's an object (not array, null, etc.)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error('Invalid metadata format');
    }

    return {
      name: parsed.name || defaultMetadata.name,
      description: parsed.description || '',
      image: parsed.image || '',
      link: parsed.link || parsed.external_link || '', // Support both variants
      isV2Format: true,
    };
  } catch {
    // If JSON parsing fails, treat as legacy string metadata
    // Legacy behavior: use string as name if short, description if long
    const cleanMetadata = rawMetadata.trim();

    if (cleanMetadata.length <= 50) {
      // Short string = likely a name
      return {
        ...defaultMetadata,
        name: cleanMetadata,
        isV2Format: false,
      };
    } else {
      // Long string = likely a description
      return {
        ...defaultMetadata,
        name: 'Cookie Jar',
        description: cleanMetadata,
        isV2Format: false,
      };
    }
  }
}

/**
 * Get just the jar name from raw metadata
 * Convenience function for components that only need the name
 *
 * @param rawMetadata - Raw metadata string
 * @returns Jar name
 */
export function getJarName(rawMetadata: string | undefined): string {
  return parseJarMetadata(rawMetadata).name;
}

/**
 * Get just the description from raw metadata
 *
 * @param rawMetadata - Raw metadata string
 * @returns Jar description
 */
export function getJarDescription(rawMetadata: string | undefined): string {
  return parseJarMetadata(rawMetadata).description;
}

/**
 * Create JSON metadata string for contract storage
 *
 * @param metadata - Structured metadata object
 * @returns JSON string ready for contract storage
 */
export function createMetadataJson(
  metadata: Omit<ParsedJarMetadata, 'isV2Format'>
): string {
  return JSON.stringify({
    name: metadata.name,
    description: metadata.description,
    image: metadata.image,
    link: metadata.link,
  });
}

/**
 * Validate metadata size for contract storage
 * Cookie Jar contracts have an 8KB metadata limit
 *
 * @param metadataJson - JSON metadata string
 * @returns Object with validation result and size
 */
export function validateMetadataSize(metadataJson: string): {
  valid: boolean;
  size: number;
  maxSize: number;
  error?: string;
} {
  const maxSize = 8192; // 8KB
  const size = new TextEncoder().encode(metadataJson).length;

  if (size > maxSize) {
    return {
      valid: false,
      size,
      maxSize,
      error: `Metadata is too large (${size} bytes). Maximum allowed size is ${maxSize} bytes (8KB).`,
    };
  }

  return {
    valid: true,
    size,
    maxSize,
  };
}

/**
 * Validate URL format
 *
 * @param url - URL string to validate
 * @returns True if valid URL format
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
