import type { Metadata } from 'next';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Đăng nhập quản trị',
  description: 'Trang đăng nhập hệ thống quản trị VoucherFinder.',
  robots: { index: false, follow: false },
};

/**
 * Login page — rendered WITHOUT the admin layout wrapper.
 *
 * The admin layout (/admin/layout.tsx) wraps all /admin/* routes with
 * AdminRouteGuard which calls server-side auth functions. If those throw,
 * the entire page crashes with a 500 error.
 *
 * By using this as a standalone page (not wrapped in admin layout),
 * we avoid the server-side auth chain and can render the login form directly.
 */
export default function StandaloneLoginPage() {
  return <LoginForm />;
}
