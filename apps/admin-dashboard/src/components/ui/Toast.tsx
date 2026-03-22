'use client';

/**
 * Design System — Toast / Alert
 *
 * Non-blocking notification messages.
 * Uses a simple React context so any component can fire a toast.
 *
 * Usage:
 *   // Fire from anywhere
 *   const toast = useToast();
 *   toast.success('Saved successfully!');
 *   toast.error('Something went wrong', { description: 'Try again later' });
 *
 *   // Wrap your app
 *   <ToastProvider>
 *     <App />
 *   </ToastProvider>
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

// =============================================================================
// Types
// =============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
  action?: React.ReactNode;
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
}

// =============================================================================
// Icons per type
// =============================================================================

const TOAST_ICONS: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const TOAST_STYLES: Record<ToastType, { border: string; bg: string; iconColor: string; titleColor: string; descColor: string }> = {
  success: {
    border:     'border-green-200',
    bg:         'bg-green-50',
    iconColor:  'text-green-500',
    titleColor: 'text-green-800',
    descColor:  'text-green-700',
  },
  error: {
    border:     'border-red-200',
    bg:         'bg-red-50',
    iconColor:  'text-red-500',
    titleColor: 'text-red-800',
    descColor:  'text-red-700',
  },
  warning: {
    border:     'border-amber-200',
    bg:         'bg-amber-50',
    iconColor:  'text-amber-500',
    titleColor: 'text-amber-800',
    descColor:  'text-amber-700',
  },
  info: {
    border:     'border-blue-200',
    bg:         'bg-blue-50',
    iconColor:  'text-blue-500',
    titleColor: 'text-blue-800',
    descColor:  'text-blue-700',
  },
};

// =============================================================================
// Toast item
// =============================================================================

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { id, type, title, description, duration = 4000, action } = toast;
  const styles = TOAST_STYLES[type];
  const Icon = TOAST_ICONS[type];

  useEffect(() => {
    if (duration === Infinity) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={clsx(
        'w-80 rounded-xl border bg-white shadow-lg',
        'flex items-start gap-3 p-4',
        'animate-slide-up',
        styles.border
      )}
    >
      {/* Icon */}
      <div className={clsx('flex-shrink-0 mt-0.5', styles.iconColor)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-semibold', styles.titleColor)}>{title}</p>
        {description && (
          <p className={clsx('mt-0.5 text-xs leading-relaxed', styles.descColor)}>
            {description}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
        className="flex-shrink-0 rounded text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// =============================================================================
// Context
// =============================================================================

interface ToastContextValue {
  toast: (type: ToastType, options: ToastOptions) => void;
  success: (title: string, options?: Omit<ToastOptions, 'title'>) => void;
  error:   (title: string, options?: Omit<ToastOptions, 'title'>) => void;
  warning: (title: string, options?: Omit<ToastOptions, 'title'>) => void;
  info:    (title: string, options?: Omit<ToastOptions, 'title'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// =============================================================================
// Provider
// =============================================================================

export interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 4 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((type: ToastType, options: ToastOptions) => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => {
      const next = [{ id, type, ...options }, ...prev];
      return next.slice(0, maxToasts);
    });
  }, [maxToasts]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    success: (title, opts = {}) => addToast('success', { title, ...opts }),
    error:   (title, opts = {}) => addToast('error',   { title, ...opts }),
    warning: (title, opts = {}) => addToast('warning', { title, ...opts }),
    info:    (title, opts = {}) => addToast('info',    { title, ...opts }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container — rendered via portal */}
      {typeof window !== 'undefined' &&
        createPortal(
          <div
            role="region"
            aria-label="Thông báo"
            aria-live="polite"
            className="fixed bottom-4 right-4 z-toast flex flex-col gap-2 items-end"
          >
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export default ToastProvider;
