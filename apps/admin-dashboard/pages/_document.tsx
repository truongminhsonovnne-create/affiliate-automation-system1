import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Minimal Pages Router _document override.
 *
 * This file exists solely to prevent Next.js 14 from pulling in the
 * Pages Router `Html` component from the monorepo root's `src/app/`
 * directory (D:\Affiliate\src\app\(public)\layout.tsx) into the build
 * trace during the /404 and /500 static pre-render step.
 *
 * Without this file, the internal pages-runtime.prod.js bundles an
 * Html-class component from user-land code, causing:
 *   "<Html> should not be imported outside of pages/_document"
 *
 * This override uses only the built-in next/document exports and
 * provides no extra features — it just satisfies the import guard.
 */
export default function Document() {
  return (
    <Html lang="vi">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
