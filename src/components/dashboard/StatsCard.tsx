import React from 'react';

type StatsCardProps = {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral' | 'warning' | 'success';
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  description?: string;
};

const changeStyles: Record<string, string> = {
  increase: 'text-emerald-400',
  decrease: 'text-rose-400',
  neutral: 'text-slate-300',
  warning: 'text-yellow-300',
  success: 'text-emerald-300',
};

export function StatsCard({ title, value, change, changeType = 'neutral', icon: Icon, loading, description }: StatsCardProps) {
  return (
    <div className="rounded-3xl border border-gray-800 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{loading ? '–' : value}</p>
        </div>
        <div className="rounded-2xl bg-slate-950/90 p-3 text-slate-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {change && (
        <p className={`mt-4 text-sm font-medium ${changeStyles[changeType] ?? changeStyles.neutral}`}>
          {change}
        </p>
      )}
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
    </div>
  );
}
