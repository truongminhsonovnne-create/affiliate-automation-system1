/**
 * Design System — Component Index
 *
 * Import everything from this barrel file:
 *   import { Button, Input, Badge, Card, ... } from '@/components/ui';
 */

// ================================================================
// Form controls
// ================================================================

export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';

export { Select } from './Select';
export type { SelectProps, SelectOption } from './Select';

// ================================================================
// Display
// ================================================================

export {
  Badge,
  SuccessBadge,
  WarningBadge,
  ErrorBadge,
  InfoBadge,
  BrandBadge,
} from './Badge';
export type { BadgeProps } from './Badge';

export { Card, CardHeader, CardFooter, CardDivider } from './Card';
export type { CardProps, CardHeaderProps, CardFooterProps } from './Card';

// ================================================================
// Navigation / Overlay
// ================================================================

export { Modal, ModalFooter } from './Modal';
export type { ModalProps } from './Modal';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';
export type { TabsProps } from './Tabs';

// ================================================================
// Feedback
// ================================================================

export { ToastProvider, useToast } from './Toast';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';
