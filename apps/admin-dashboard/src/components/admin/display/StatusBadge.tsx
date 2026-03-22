'use client';

/**
 * StatusBadge — Wraps the DS Badge component for backward compatibility.
 * Prefer using <Badge> directly from the design system.
 */

import { Badge } from '@/components/ui';
import clsx from 'clsx';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps {
  variant?: BadgeVariant;
  label: string;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/** Map our variant names to the DS Badge color system */
const VARIANT_MAP: Record<Exclude<BadgeVariant, 'neutral'>, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  default:  'default',
  success: 'success',
  warning: 'warning',
  error:   'error',
  info:    'info',
};

export function StatusBadge({
  variant = 'default',
  label,
  dot = false,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const color = variant === 'neutral' ? 'default' : VARIANT_MAP[variant];

  return (
    <Badge
      color={color}
      variant="soft"
      size={size}
      dot={dot}
      className={className}
    >
      {label}
    </Badge>
  );
}

export default StatusBadge;
