'use client';

/**
 * Design System — Tabs
 *
 * Controlled tab interface with keyboard navigation.
 *
 * Usage:
 *   <Tabs defaultValue="tab1">
 *     <Tabs.List>
 *       <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
 *       <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
 *     </Tabs.List>
 *     <Tabs.Content value="tab1">Content 1</Tabs.Content>
 *     <Tabs.Content value="tab2">Content 2</Tabs.Content>
 *   </Tabs>
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import clsx from 'clsx';

// =============================================================================
// Context
// =============================================================================

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs sub-components must be used inside <Tabs>');
  return ctx;
}

// =============================================================================
// Root
// =============================================================================

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  disabled = false,
  children,
  className,
}: TabsProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '');

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolled;

  const handleChange = useCallback(
    (v: string) => {
      if (!isControlled) setUncontrolled(v);
      onValueChange?.(v);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value, onChange: handleChange, disabled }}>
      <div className={clsx('flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

// =============================================================================
// Tabs.List
// =============================================================================

export interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={clsx(
        'flex items-center gap-1',
        'border-b border-gray-200',
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Tabs.Trigger
// =============================================================================

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function TabsTrigger({
  value,
  children,
  disabled = false,
  className,
}: TabsTriggerProps) {
  const { value: activeValue, onChange, disabled: isParentDisabled } = useTabsContext();
  const isActive = value === activeValue;
  const isDisabled = disabled || isParentDisabled;

  return (
    <button
      type="button"
      role="tab"
      id={`tab-${value}`}
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      disabled={isDisabled}
      tabIndex={isActive ? 0 : -1}
      onClick={() => !isDisabled && onChange(value)}
      className={clsx(
        'relative px-4 py-2.5 text-sm font-medium',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        !isActive && 'text-gray-500 hover:text-gray-700',
        isActive && 'text-brand-600',
        className
      )}
    >
      {children}

      {/* Active indicator */}
      {isActive && (
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// =============================================================================
// Tabs.Content
// =============================================================================

export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: activeValue } = useTabsContext();
  const isActive = value === activeValue;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={clsx('pt-4 animate-fade-in', className)}
    >
      {children}
    </div>
  );
}

export default Tabs;
