import React from 'react';

export function DemoModeBanner() {
  return (
    <div className="rounded-[2rem] border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-100 shadow-sm shadow-orange-500/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-orange-200">Demo mode enabled</p>
          <p className="text-sm text-orange-100/80">This dashboard is running with mock data and simulated Stripe events for previewing the recovery workflow.</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-100">Preview only</span>
      </div>
    </div>
  );
}
