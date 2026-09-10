'use client';

import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Mail,
  Send,
  XCircle,
} from 'lucide-react';

type Scenario = {
  id: string;
  label: string;
  declineCode: string;
  attemptCount: number;
  description: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'soft',
    label: 'Soft decline',
    declineCode: 'insufficient_funds',
    attemptCount: 2,
    description: 'Insufficient funds — Stripe retries, no card update needed.',
  },
  {
    id: 'hard',
    label: 'Card expired',
    declineCode: 'expired_card',
    attemptCount: 1,
    description: 'Hard decline — customer must update their payment method.',
  },
  {
    id: 'auth',
    label: 'Auth required',
    declineCode: 'authentication_required',
    attemptCount: 1,
    description: '3-D Secure — customer must confirm the payment with their bank.',
  },
  {
    id: 'final',
    label: 'Final notice',
    declineCode: 'insufficient_funds',
    attemptCount: 4,
    description: 'Last attempt failed — fires the “pay or lose access” notice.',
  },
];

export default function SimulatorPage() {
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[1]);
  const [email, setEmail] = useState('demo@example.com');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const failureRes = await fetch('/api/demo/failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          declineCode: scenario.declineCode,
          attemptCount: scenario.attemptCount,
        }),
      });
      const failureJson = await failureRes.json();

      if (!failureJson.ok) {
        setError(failureJson.error ?? 'Injection failed');
        return;
      }

      const workerRes = await fetch('/api/demo/run-worker', { method: 'POST' });
      const workerJson = await workerRes.json();

      setResult({
        injected: failureJson.result,
        worker: workerJson.worker,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Failure Simulator</h1>
        <p className="text-sm text-slate-400">
          Inject a failed payment and watch it travel the whole recovery pipeline — including a real
          Klaviyo email.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/40 p-5 lg:col-span-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-500">Customer email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              The real dunning email lands in this inbox (use a test inbox you control).
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-slate-500">Decline scenario</label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s)}
                  className={`rounded-lg border p-3 text-left transition ${
                    scenario.id === s.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <p className="text-sm font-medium text-white">{s.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{s.description}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={run}
            disabled={running}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {running ? 'Running pipeline…' : 'Run demo flow'}
          </button>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-3 rounded-lg border border-gray-800 bg-gray-950/60 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">Pipeline complete</span>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <Field label="Event" value={result.injected?.eventId} />
                <Field label="Invoice" value={result.injected?.invoiceId} />
                <Field label="Cycle" value={result.injected?.cycleId} />
                <Field label="Decline" value={result.injected?.declineCode} />
                <Field label="Klaviyo event" value={result.injected?.eventName ?? '—'} />
                <Field
                  label="Email send"
                  value={
                    result.worker?.sent > 0
                      ? 'sent ✓'
                      : result.worker?.failed > 0
                        ? 'failed ✗'
                        : 'queued'
                  }
                />
              </dl>
              {result.worker?.failed > 0 && (
                <p className="text-xs text-amber-400">
                  The send failed — check KLAVIYO_PRIVATE_API_KEY in .env.local.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Reference */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <h3 className="font-semibold text-white">Stripe test cards</h3>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-slate-400">
              <li className="flex justify-between">
                <span>Soft decline (insufficient funds)</span>
                <code className="text-slate-300">4000 0000 0000 9995</code>
              </li>
              <li className="flex justify-between">
                <span>Generic decline</span>
                <code className="text-slate-300">4000 0000 0000 0002</code>
              </li>
              <li className="flex justify-between">
                <span>Expired card</span>
                <code className="text-slate-300">4000 0000 0000 0069</code>
              </li>
              <li className="flex justify-between">
                <span>Success</span>
                <code className="text-slate-300">4242 4242 4242 4242</code>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <h3 className="font-semibold text-white">What just happened</h3>
            </div>
            <ol className="mt-3 space-y-2 text-xs text-slate-400">
              {[
                'Stripe fired invoice.payment_failed (synthetic).',
                'Webhook deduped it via webhook_receipts.',
                'Decline classified into a category bucket.',
                'Dunning cycle + attempt written to Supabase.',
                'Klaviyo send enqueued (async, not in the webhook).',
                'Worker delivered the real email to the inbox.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-slate-200">{value}</dd>
    </div>
  );
}
