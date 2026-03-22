/**
 * pages/500.tsx — Custom 500 page for App Router project
 *
 * App Router (Next.js 14) still generates pages/_error.tsx for /404 and /500
 * as part of its internal Pages Router layer. By creating pages/500.tsx here,
 * we explicitly override those routes so the App Router handles them instead.
 */
export default function InternalServerError() {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>500 — Lỗi máy chủ | VoucherFinder</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '4rem', fontWeight: 700, color: '#ef4444', lineHeight: 1 }}>500</div>
          <h1 style={{ margin: '1rem 0 0.5rem', fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>
            Lỗi máy chủ nội bộ
          </h1>
          <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.
          </p>
          <a
            href="/home"
            style={{
              display: 'inline-block',
              padding: '0.625rem 1.25rem',
              background: '#f97316',
              color: '#fff',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Về trang chủ
          </a>
        </div>
      </body>
    </html>
  );
}
