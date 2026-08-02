import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NativeSelectProps =
  React.SelectHTMLAttributes<HTMLSelectElement>;

/**
 * A lightweight, fully-accessible native <select> styled to match the design
 * system. Used for discrete choices (language, theme) where the native picker
 * is the most reliable and RTL-friendly control.
 */
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  NativeSelectProps
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'h-11 w-full appearance-none rounded-xl border border-input bg-background px-3.5 pe-10 text-base ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
  </div>
));
NativeSelect.displayName = 'NativeSelect';
