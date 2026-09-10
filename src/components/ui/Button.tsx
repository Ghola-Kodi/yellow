import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const variantStyles: Record<string, string> = {
  default: 'bg-blue-600 text-white hover:bg-blue-500 border border-transparent',
  outline: 'border border-slate-700 bg-transparent text-slate-100 hover:bg-slate-900',
  ghost: 'bg-transparent text-slate-100 hover:bg-slate-900',
  destructive: 'bg-red-600 text-white hover:bg-red-500 border border-transparent',
  success: 'bg-emerald-600 text-white hover:bg-emerald-500 border border-transparent',
  warning: 'bg-yellow-500 text-slate-950 hover:bg-yellow-400 border border-transparent',
  info: 'bg-sky-600 text-white hover:bg-sky-500 border border-transparent',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base',
};

export function Button({ variant = 'default', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-full font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${variantStyles[variant] ?? variantStyles.default} ${sizeStyles[size] ?? sizeStyles.md} ${className}`}
    >
      {children}
    </button>
  );
}

