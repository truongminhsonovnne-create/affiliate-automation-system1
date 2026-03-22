'use client';

import { redirect } from 'next/navigation';

/**
 * Redirect admin root to dashboard
 */
export default function AdminRootPage() {
  redirect('/admin/dashboard');
}
