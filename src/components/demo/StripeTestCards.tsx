import React from 'react';

const cards = [
  { label: 'Success', number: '4242 4242 4242 4242', description: 'Successful payment' },
  { label: 'Soft Decline', number: '4000 0000 0000 9995', description: 'Temporary issue' },
  { label: 'Hard Decline', number: '4000 0000 0000 0002', description: 'Card permanently declined' },
];

export function StripeTestCards() {
  return (
    <div className="rounded-3xl border border-gray-800 bg-slate-950/80 p-5 shadow-sm shadow-black/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Stripe test cards</p>
          <p className="text-xs text-slate-500">Use these inside the simulator</p>
        </div>
      </div>

      <div className="space-y-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-white">{card.label}</p>
              <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">Test</span>
            </div>
            <p className="mt-3 text-sm text-slate-300">{card.number}</p>
            <p className="mt-2 text-xs text-slate-500">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
