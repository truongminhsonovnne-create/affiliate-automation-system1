/**
 * pages/404.tsx — Minimal fallback 404 for Pages Router layer.
 *
 * Next.js App Router still generates internal Pages Router error pages.
 * This file MUST NOT return <html> or <body> — it is wrapped by
 * the internal _document.tsx. Returning only the inner content avoids
 * the "<Html> should not be imported outside of pages/_document" error.
 *
 * In practice, the App Router not-found.tsx (app/not-found.tsx) handles
 * all real 404 rendering. This file exists only to prevent Pages Router
 * build failures.
 */
export default function NotFound() {
  return (
    <div style={{
      margin: 0,
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f9fafb',
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '4rem', fontWeight: 700, color: '#f97316', lineHeight: 1 }}>
          404
        </div>
        <h1 style={{ margin: '1rem 0 0.5rem', fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>
          Trang không tìm thấy
        </h1>
        <p style={{ margin: '0 0 1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
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
    </div>
  );
}
