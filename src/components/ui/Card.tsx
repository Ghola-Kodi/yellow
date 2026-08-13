import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`rounded-lg border border-slate-700 bg-slate-900 p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

