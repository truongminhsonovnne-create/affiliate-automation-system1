'use client';

/**
 * Login Form — Client Component
 *
 * UX: Redirects to /admin/dashboard if the user already has a valid session.
 * This prevents authenticated users from seeing the login form.
 *
 * SECURITY: The Edge middleware already redirects unauthenticated users away from
 * /admin/* routes. The redirect here is purely UX — it prevents the flash of
 * the login form for already-authenticated users who visit /admin/login directly.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkSession() {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = (await response.json()) as { authenticated: boolean };
        if (data.authenticated) {
          router.replace('/admin/dashboard');
          return;
        }
      }
    } catch {
      // Network error — show login page
    } finally {
      setRedirecting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Đăng nhập thất bại');
        return;
      }

      const redirectTo = new URLSearchParams(window.location.search).get('redirect');
      router.push(
        redirectTo && redirectTo.startsWith('/') ? redirectTo : '/admin/dashboard'
      );
    } catch {
      setError('Lỗi mạng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-10 w-10 border-[3px] border-gray-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-brand-50 mb-3">
              <Lock className="h-6 w-6 text-brand-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Login</h1>
            <p className="text-sm text-gray-500">Affiliate Automation System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="username"
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoFocus
              placeholder="Nhập username"
            />

            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Nhập password"
            />

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                <svg
                  className="h-4 w-4 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3m0 3h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
                  />
                </svg>
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={loading}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Affiliate Automation &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
