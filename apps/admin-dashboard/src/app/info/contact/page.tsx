/**
 * Contact Page — /info/contact
 *
 * Server component — exports metadata only.
 * The interactive form lives in ContactForm.tsx.
 */

import type { Metadata } from 'next';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Liên hệ & Phản hồi',
  description:
    'Gửi phản hồi, báo lỗi, hoặc đề xuất tính năng cho VoucherFinder. Phản hồi trong 2–5 ngày làm việc. Không có hotline hay live chat.',
  keywords: ['liên hệ VoucherFinder', 'phản hồi', 'báo lỗi', 'đề xuất tính năng'],
  alternates: { canonical: '/info/contact' },
  openGraph: {
    title: 'Liên hệ & Phản hồi | VoucherFinder',
    description: 'Gửi phản hồi, báo lỗi, hoặc đề xuất tính năng cho VoucherFinder. Phản hồi trong 2–5 ngày làm việc.',
    url: '/info/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Liên hệ VoucherFinder',
    description: 'Gửi phản hồi hoặc báo lỗi — phản hồi trong 2–5 ngày.',
  },
};

export default function ContactPage() {
  return <ContactForm />;
}
