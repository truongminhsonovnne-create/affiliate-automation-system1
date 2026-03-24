/**
 * Pages Router _document override.
 *
 * Root cause: Next.js 14 builds a Pages Router layer for /404 and /500
 * even in an all-App-Router project. During that build it tries to resolve
 * `Html` from `next/document` to prerender the error pages.
 *
 * Because this app lives in a monorepo where `D:\Affiliate\src/app/`
 * (a Pages Router hybrid) is reachable via npm workspaces, webpack
 * sometimes resolves the monorepo's Html-class component instead of
 * Next.js's built-in one, producing:
 *
 *   "<Html> should not be imported outside of pages/_document"
 *
 * Solution: Use plain HTML/body tags instead of the `Html/Head/
 * Main/NextScript` components from `next/document`. This bypasses the
 * Html-class import guard while keeping the fallback document minimal.
 */
export default function Document() {
  return (
    <html lang="vi">
      <body />
    </html>
  );
}
