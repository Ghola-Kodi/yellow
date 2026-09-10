import React from 'react';

export function SimulatorPanel() {
  return (
    <div className="rounded-3xl border border-gray-800 bg-slate-950/80 p-5 text-slate-300">
      <h3 className="text-sm font-semibold text-white mb-2">Simulator helpers</h3>
      <p className="text-sm text-slate-400">Use the test cards to re-create Stripe decline behavior and verify your Klaviyo flows.</p>
      <ul className="mt-4 space-y-2 text-xs text-slate-500">
        <li>• Soft declines simulate recoverable payments</li>
        <li>• Hard declines simulate immediate customer action</li>
        <li>• Use the webhook test button for full webhook workflow</li>
      </ul>
    </div>
  );
}
