/**
 * Deals by Source Page — /deals/source/[source]
 *
 * Server component — exports generateMetadata and handles params.
 * All UI logic lives in SourceDealsClient.tsx.
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PublicLayout } from '@/components/public/PublicLayoutNew';
import { SourceDealsClient } from './SourceDealsClient';

interface SourcePageProps {
  params: { source: string };
}

const SOURCE_CONFIG: Record<string, {
  label: string;
  metaDescription: string;
}> = {
  masoffer: {
    label: 'MasOffer',
    metaDescription: 'Tổng hợp deal, voucher và coupon từ mạng lưới MasOffer. Cập nhật liên tục.',
  },
  accesstrade: {
    label: 'AccessTrade',
    metaDescription: 'Tổng hợp deal, voucher và coupon từ AccessTrade Vietnam. Cập nhật liên tục.',
  },
};

export async function generateMetadata({ params }: SourcePageProps): Promise<Metadata> {
  const config = SOURCE_CONFIG[params.source];
  if (!config) {
    return { title: 'Nguồn không tìm thấy | VoucherFinder' };
  }
  return {
    title: `Deals từ ${config.label} | VoucherFinder`,
    description: config.metaDescription,
    alternates: { canonical: `/deals/source/${params.source}` },
    openGraph: {
      title: `Deals từ ${config.label} | VoucherFinder`,
      description: config.metaDescription,
      url: `/deals/source/${params.source}`,
      type: 'website',
    },
  };
}

export default function SourceDealsPage({ params }: SourcePageProps) {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="mx-auto max-w-5xl px-6 py-20">
            <div className="h-8 w-48 rounded animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />
          </div>
        }
      >
        <SourceDealsClient source={params.source} />
      </Suspense>
    </PublicLayout>
  );
}
