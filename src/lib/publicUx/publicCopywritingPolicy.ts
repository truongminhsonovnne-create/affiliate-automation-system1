// =============================================================================
// Public Copywriting Policy
// Policy for user-facing copy in public product
// =============================================================================

/**
 * Get copywriting policy
 */
export function getPublicCopywritingPolicy() {
  return {
    // Tone
    tone: 'practical' as const,
    // Voice
    voice: 'helpful' as const,
    // Max length for primary messages
    maxPrimaryMessageLength: 50,
    // Max length for secondary messages
    maxSecondaryMessageLength: 100,
    // Allowed punctuation for emphasis
    allowedEmphasis: ['!'],
    // Forbidden patterns
    forbiddenPatterns: [
      'only X left',
      'ending soon',
      'hurry',
      'don\'t miss',
      'act now',
    ],
  };
}

/**
 * Validate copy tone
 */
export function validatePublicCopyTone(copy: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const policy = getPublicCopywritingPolicy();

  // Check length
  if (copy.length > policy.maxPrimaryMessageLength) {
    errors.push(`Copy too long: ${copy.length} > ${policy.maxPrimaryMessageLength}`);
  }

  // Check forbidden patterns
  for (const pattern of policy.forbiddenPatterns) {
    if (copy.toLowerCase().includes(pattern)) {
      errors.push(`Forbidden pattern found: "${pattern}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Build short action copy
 */
export function buildShortActionCopy(action: 'copy' | 'open'): string {
  switch (action) {
    case 'copy':
      return 'Sao chép';
    case 'open':
      return 'Mua ngay';
  }
}
