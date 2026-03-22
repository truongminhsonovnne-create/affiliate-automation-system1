/**
 * ArticleCard — Reusable card component for article/resource listings.
 * Uses the Design System card-interactive and pill components.
 */

import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';

export interface ArticleCardProps {
  href: string;
  title: string;
  description: string;
  category: string;
  readTime: number; // minutes
  date: string;     // e.g. "Tháng 3, 2026"
}

export function ArticleCard({
  href,
  title,
  description,
  category,
  readTime,
  date,
}: ArticleCardProps) {
  return (
    <Link
      href={href}
      className="group card-interactive flex flex-col p-5"
    >
      {/* Category badge */}
      <span className="pill-brand mb-3 w-fit">
        {category}
      </span>

      {/* Title */}
      <h3
        className="text-sm font-semibold leading-snug transition-colors"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className="mt-2 flex-1 text-xs leading-relaxed line-clamp-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        {description}
      </p>

      {/* Meta row */}
      <div className="mt-4 flex items-center justify-between">
        <div
          className="flex items-center gap-2"
          style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
        >
          <span>{date}</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {readTime} phút đọc
          </span>
        </div>
        <ArrowRight
          className="h-4 w-4 flex-shrink-0 transition-transform group-hover:text-brand-500"
          style={{ color: 'var(--gray-300)' }}
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
