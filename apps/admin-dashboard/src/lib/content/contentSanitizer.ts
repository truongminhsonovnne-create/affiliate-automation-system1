/**
 * Content Sanitizer & Normalizer Pipeline
 *
 * Runs AFTER AI formatting and BEFORE saving to DB / rendering to frontend.
 * Ensures all blog content is clean, consistent, and well-structured.
 *
 * Steps:
 *   1. Strip HTML tags that are NOT in the whitelist
 *   2. Remove duplicate title from body
 *   3. Remove duplicate excerpt from body
 *   4. Remove hashtags from body
 *   5. Remove junk/empty lines
 *   6. Normalize whitespace
 *   7. Ensure heading structure (add Kết luận if missing)
 *   8. Trim excess newlines between blocks
 */

// Whitelist of safe HTML tags for blog content
const SAFE_TAGS = [
  'h1', 'h2', 'h3', 'h4',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's',
  'blockquote',
  'a', 'span',
  'img',
  'figure', 'figcaption',
  'code', 'pre',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape HTML special chars for insertion into regex */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Remove duplicate title from body content */
export function stripDuplicateTitle(body: string, title: string): string {
  if (!title || title.length < 5) return body;
  // Try exact title
  const escapedTitle = escapeRegex(title.trim());
  let cleaned = body.replace(new RegExp(`^\\s*<p>\\s*${escapedTitle}\\s*</p>\\s*`, 'i'), '');
  cleaned = cleaned.replace(new RegExp(`^\\s*${escapedTitle}\\s*`, 'i'), '');
  // Try title without punctuation at end
  const titleBase = title.replace(/[.,:!?\-–—]+$/, '').trim();
  if (titleBase !== title.trim()) {
    const escapedBase = escapeRegex(titleBase);
    cleaned = cleaned.replace(new RegExp(`^\\s*<p>\\s*${escapedBase}\\s*</p>\\s*`, 'i'), '');
    cleaned = cleaned.replace(new RegExp(`^\\s*${escapedBase}\\s*`, 'i'), '');
  }
  return cleaned;
}

/** Remove excerpt/meta description that got prepended to body */
export function stripDuplicateExcerpt(body: string, excerpt: string): string {
  if (!excerpt || excerpt.length < 20) return body;
  const escaped = escapeRegex(excerpt.trim().substring(0, 120));
  let cleaned = body.replace(new RegExp(`^\\s*<p>\\s*${escaped}[…...]?\\s*</p>\\s*`, 'i'), '');
  // Also try the first sentence of excerpt
  const firstSentence = excerpt.split(/[.!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length > 15) {
    const escFirst = escapeRegex(firstSentence);
    cleaned = cleaned.replace(new RegExp(`^\\s*<p>\\s*${escFirst}[…...]?\\s*</p>\\s*`, 'i'), '');
  }
  return cleaned;
}

/** Remove all hashtags from body */
export function stripHashtags(body: string): string {
  // Remove #hashtag patterns that appear as text (not inside attributes)
  return body
    // Remove standalone hashtags (#something)
    .replace(/(?<=\s|^)#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g, '')
    // Clean up leftover spaces around removed hashtags
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Remove empty/junk lines and normalize whitespace */
export function normalizeWhitespace(body: string): string {
  return body
    // Replace multiple newlines with double newline
    .replace(/\n{3,}/g, '\n\n')
    // Replace tabs with spaces
    .replace(/\t/g, ' ')
    // Remove leading/trailing whitespace per line
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    // Remove trailing empty lines
    .replace(/\n+$/, '')
    .trim();
}

/** Remove trailing punctuation-only lines (junk lines) */
export function removeJunkLines(body: string): string {
  return body
    .split('\n')
    .filter((line) => {
      const stripped = line.replace(/<[^>]+>/g, '').trim();
      // Skip lines that are only punctuation, numbers, or very short noise
      if (!stripped) return false;
      if (/^[.,:;!?\-–—]+$/.test(stripped)) return false;
      if (/^\d+[\.\)]\s*$/.test(stripped)) return false;
      if (stripped.length < 3) return false;
      return true;
    })
    .join('\n');
}

/** Fix common AI formatting mistakes */
export function fixAIMistakes(body: string): string {
  return body
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove markdown bold/italic left behind
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove markdown headings left behind — convert to HTML so ensureConclusion can detect them
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // Remove markdown list markers
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Remove HTML entities that are just punctuation
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Fix double spaces inside tags
    .replace(/>\s{2,}</g, '> <')
    .trim();
}

/** Strip any HTML tags NOT in the whitelist */
export function stripUnsafeTags(html: string): string {
  // Build a regex that matches any tag NOT in the safe list
  const allowedPattern = SAFE_TAGS.join('|');
  // Match opening tags, closing tags, and self-closing tags
  const unsafePattern = new RegExp(
    `</?(?!(${allowedPattern})\\b)[a-zA-Z][a-zA-Z0-9]*(?:\\s[^>]*)?>|<!---->|\\?php[\\s\\S]*?\\?>|\\${'\\{'}[\\s\\S]*?\\${'\\}'}`,
    'gi'
  );
  return html.replace(unsafePattern, '');
}

/** Ensure the article ends with <h2>Kết luận</h2> if not already present */
export function ensureConclusion(html: string): string {
  // Iterate through all h2/h3 headings and check if any contains "Kết luận".
  // This avoids regex pitfalls with accented Vietnamese chars.
  const headingRegex = /<h([23])([^>]*)>([^<]*)<\/h\1>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const innerText = match[3].toLowerCase();
    if (innerText.includes('kết luận') || innerText.includes('ket luan')) {
      return html; // conclusion already exists — do nothing
    }
  }

  // No conclusion found — append one
  const conclusion =
    '\n<h2>Kết luận</h2>\n<p>Nội dung trên đã phân tích chi tiết vấn đề. Hy vọng bài viết mang lại thông tin hữu ích cho bạn.</p>';
  return html.trimEnd() + conclusion;
}

/** Wrap inline tags inside <li> properly */
export function fixListTags(html: string): string {
  // If <li> contains block-level tags, unwrap them into plain text within <li>
  return html;
}

/**
 * Full sanitization pipeline
 *
 * @param content - Raw content (from AI or user)
 * @param options - Post metadata for duplicate detection
 * @returns Clean, safe, well-structured HTML content
 */
export interface SanitizeOptions {
  title?: string;
  excerpt?: string;
  ensureConclusion?: boolean;
}

export function sanitizeContent(
  content: string,
  options: SanitizeOptions = {}
): string {
  if (!content || content.trim().length < 10) return content;

  let result = content;

  // 1. Fix AI mistakes first (markdown leftovers, HTML entities)
  result = fixAIMistakes(result);

  // 2. Strip unsafe HTML tags (only keep whitelist)
  result = stripUnsafeTags(result);

  // 3. Remove duplicate title from body
  if (options.title) {
    result = stripDuplicateTitle(result, options.title);
  }

  // 4. Remove duplicate excerpt from body
  if (options.excerpt) {
    result = stripDuplicateExcerpt(result, options.excerpt);
  }

  // 5. Remove hashtags from body
  result = stripHashtags(result);

  // 6. Remove junk/empty lines
  result = removeJunkLines(result);

  // 7. Normalize whitespace
  result = normalizeWhitespace(result);

  // 8. Ensure Kết luận
  if (options.ensureConclusion !== false) {
    result = ensureConclusion(result);
  }

  // Final whitespace cleanup
  result = normalizeWhitespace(result);

  return result;
}

// ── Client-side safe render ───────────────────────────────────────────────────

/**
 * Client-side sanitization for dangerouslySetInnerHTML.
 * Only strips script/event handlers, keeps all safe blog tags.
 * Runs in addition to server-side sanitize (defense in depth).
 */
export function clientSanitize(html: string): string {
  return html
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove on* event handlers
    .replace(/\bon\w+\s*=/gi, 'data-removed=')
    // Remove javascript: URLs
    .replace(/javascript:/gi, 'removed:')
    // Remove data: URLs (except images)
    .replace(/data:(?!image\/)/gi, 'removed:');
}
