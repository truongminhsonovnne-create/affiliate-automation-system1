'use client';

/**
 * ShortcutStrip — Horizontal scrollable shortcut chip strip.
 *
 * Appears immediately below the sticky header on all public pages,
 * giving users instant access to key content areas without needing
 * to scroll or open the hamburger menu.
 *
 * Mobile: scrollable row, first chip partly peeks on 360px
 * Desktop: single row, no scroll needed
 */

import Link from 'next/link';
import { Flame, Tag, TrendingUp, Clock, BookOpen } from 'lucide-react';

export const SHORTCUT_ITEMS = [
  {
    href: '/deals/hot',
    label: 'Deal Hot',
    icon: Flame,
    bg: '#fff1f2',
    color: '#be123c',
    border: '#fecdd3',
    hoverBg: '#ffe4e6',
  },
  {
    href: '/deals',
    label: 'Mã Giảm Giá',
    icon: Tag,
    bg: '#fff7ed',
    color: '#c2410c',
    border: '#fed7aa',
    hoverBg: '#ffedd5',
  },
  {
    href: '/deals/source/shopee',
    label: 'Shopee Hôm Nay',
    icon: TrendingUp,
    bg: '#f0fdf4',
    color: '#15803d',
    border: '#bbf7d0',
    hoverBg: '#dcfce7',
  },
  {
    href: '/deals/expiring',
    label: 'Sắp Hết Hạn',
    icon: Clock,
    bg: '#fefce8',
    color: '#92400e',
    border: '#fde68a',
    hoverBg: '#fef9c3',
  },
  {
    href: '/blog',
    label: 'Blog SEO',
    icon: BookOpen,
    bg: '#eff6ff',
    color: '#1d4ed8',
    border: '#bfdbfe',
    hoverBg: '#dbeafe',
  },
];

export function ShortcutStrip() {
  return (
    <div
      className="w-full"
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      <div
        className="mx-auto flex gap-2 overflow-x-auto pb-2 pt-2"
        role="navigation"
        aria-label="Liên kết nhanh"
        style={{
          maxWidth: '72rem',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Hide scrollbar on webkit */}
        <style>{`
          .shortcut-strip-scroll::-webkit-scrollbar { display: none; }
        `}</style>
        <div className="shortcut-strip-scroll flex gap-2 overflow-x-auto">
          {SHORTCUT_ITEMS.map(({ href, label, icon: Icon, bg, color, border, hoverBg }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: bg,
                color,
                border: `1px solid ${border}`,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = hoverBg; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = bg; }}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShortcutStrip;
