import React from 'react';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'warning' | 'info' | 'destructive';
  className?: string;
};

const badgeStyles: Record<string, string> = {
  default: 'bg-slate-800 text-slate-200',
  success: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  warning: 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20',
  info: 'bg-sky-500/10 text-sky-300 border border-sky-500/20',
  destructive: 'bg-red-500/10 text-rose-300 border border-red-500/20',
};

export function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${badgeStyles[variant]} ${className}`}
    />
  );
}

