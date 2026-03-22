'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Globe, Send } from 'lucide-react';
import clsx from 'clsx';

const jobsNav = [
  {
    label: 'Crawl Jobs',
    href: '/admin/jobs/crawl',
    icon: Globe,
  },
  {
    label: 'Publish Jobs',
    href: '/admin/jobs/publish',
    icon: Send,
  },
];

/**
 * Jobs layout with sub-navigation
 */
export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex">
        {jobsNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
