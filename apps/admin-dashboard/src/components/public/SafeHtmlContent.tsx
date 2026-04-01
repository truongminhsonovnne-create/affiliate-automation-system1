'use client';

/**
 * SafeHtmlContent — Client-side sanitized HTML renderer
 *
 * Runs clientSanitize() on the HTML before rendering via dangerouslySetInnerHTML.
 * This is defense-in-depth on top of server-side sanitize.
 * Safe whitelist: h2, h3, p, ul, li, ol, strong, em, blockquote, br, span
 */

import { clientSanitize } from '@/lib/content/contentSanitizer';

interface SafeHtmlContentProps {
  html: string;
  className?: string;
}

export function SafeHtmlContent({ html, className }: SafeHtmlContentProps) {
  const safe = clientSanitize(html);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

export default SafeHtmlContent;
