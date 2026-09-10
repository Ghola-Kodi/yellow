import React from 'react';

type RecoveryMetricsChartProps = {
  timeRange: '7d' | '30d' | '90d';
};

const series = {
  '7d': [65, 72, 68, 74, 70, 78, 72],
  '30d': [58, 62, 66, 68, 70, 73, 68],
  '90d': [51, 55, 59, 62, 66, 69, 71],
};

export function RecoveryMetricsChart({ timeRange }: RecoveryMetricsChartProps) {
  const data = series[timeRange];

  return (
    <div className="rounded-3xl border border-gray-800 bg-slate-950/80 p-5 shadow-sm shadow-black/10">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-white">Recovery trend</p>
          <p className="text-xs text-slate-500">{timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}</p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-300">Recovery rate</span>
      </div>
      <div className="grid grid-cols-7 gap-2 h-40 items-end">
        {data.map((value, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <div className="relative w-full rounded-full bg-slate-900" style={{ height: `${Math.max(value, 10)}%` }}>
              <div className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-emerald-400 to-transparent" style={{ height: `${Math.max(value, 10)}%` }} />
            </div>
            <span className="text-[10px] text-slate-500">{index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
