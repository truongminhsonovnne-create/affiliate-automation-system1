'use client';

/**
 * Global Error Boundary — catches uncaught React errors across the entire app.
 *
 * This prevents white-screen crashes and shows a user-friendly error message
 * instead, even when the root cause is in a deeply nested component.
 *
 * IMPORTANT: This must be a 'use client' file named global-error.tsx
 * and placed in the app/ directory. Next.js automatically uses it
 * for client-side errors that would otherwise cause a white screen.
 */

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="vi">
      <body style={{
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          maxWidth: '480px',
          padding: '2rem',
          textAlign: 'center',
        }}>
          {/* Error icon */}
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
          }}>
            <span style={{ fontSize: '4rem' }}>⚠️</span>
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '0.5rem',
          }}>
            Đã xảy ra lỗi không mong muốn
          </h1>

          {/* Description */}
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '1.5rem',
            lineHeight: 1.6,
          }}>
            Xin lỗi, đã có lỗi xảy ra khi tải trang này.
            {error.digest && (
              <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                Mã lỗi: {error.digest}
              </span>
            )}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#f97316',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(249,115,22,0.25)',
              }}
            >
              Thử lại
            </button>
            <a
              href="/home"
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Về trang chủ
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
