'use client';

/**
 * Design System v2 — Card
 *
 * Unified card container. Four variants:
 *   flat     — subtle border only (inline content)
 *   raised   — shadow + border (default, for standalone cards)
 *   elevated — stronger shadow (modals, overlays)
 *   surface  — layered shadow (floating panels)
 *
 * Usage:
 *   <Card>
 *     <Card.Header title="Summary" />
 *     ...content
 *   </Card>
 */

import clsx from 'clsx';

// =============================================================================
// Card root
// =============================================================================

export interface CardProps {
  children: React.ReactNode;
  variant?: 'flat' | 'raised' | 'elevated' | 'surface';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  /** Interactive card — adds hover lift */
  interactive?: boolean;
  onClick?: () => void;
}

const VARIANT_STYLES = {
  flat:     'bg-[var(--surface-raised)] border border-[var(--border-subtle)] shadow-[var(--shadow-1)]',
  raised:   'bg-[var(--surface-raised)] border border-[var(--border-default)] shadow-[var(--shadow-float)]',
  elevated: 'bg-[var(--surface-raised)] border border-[var(--border-default)] shadow-[var(--shadow-lg)]',
  surface:  'bg-[var(--surface-raised)] border border-[var(--border-subtle)] shadow-[var(--shadow-float)]',
};

const PADDING_STYLES = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

export function Card({
  children,
  variant = 'raised',
  padding = 'md',
  className,
  as: Tag = 'div',
  interactive = false,
  onClick,
}: CardProps) {
  return (
    <Tag
      onClick={onClick}
      className={clsx(
        'rounded-[var(--radius-md)]',
        VARIANT_STYLES[variant],
        PADDING_STYLES[padding],
        interactive && [
          'cursor-pointer',
          'select-none',
          'transition-all duration-[var(--duration)]',
          'hover:border-[var(--brand-200)]',
          'hover:shadow-[var(--shadow-lg)]',
          'hover:-translate-y-px',
          'active:translate-y-0',
        ].join(' '),
        className
      )}
    >
      {children}
    </Tag>
  );
}

// =============================================================================
// Card.Header
// =============================================================================

export interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: CardHeaderProps) {
  return (
    <div className={clsx('flex items-start justify-between gap-4', className)}>
      <div>
        <h3
          className="font-semibold leading-snug"
          style={{
            color: 'var(--text-primary)',
            fontSize: 'var(--font-sm)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            className="mt-0.5"
            style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// =============================================================================
// Card.Footer
// =============================================================================

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 pt-4 mt-4',
        className
      )}
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Card.Divider
// =============================================================================

export function CardDivider({ className }: { className?: string }) {
  return (
    <div
      className={clsx('my-4', className)}
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    />
  );
}

// =============================================================================
// Card.Section — for complex card layouts
// =============================================================================

export interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Lighter background within card */
  muted?: boolean;
}

export function CardSection({ children, className, muted }: CardSectionProps) {
  return (
    <div
      className={clsx(
        'py-3 -mx-4 px-4',
        muted && 'bg-[var(--gray-50)] -mx-4 px-4 rounded-b-[var(--radius-md)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export default Card;
