'use client';

import { FormEvent, useMemo, useState } from 'react';

const industries = [
  { id: 'real_estate', label: 'Real Estate', detail: 'Staging a listing' },
  { id: 'ecommerce', label: 'Ecommerce', detail: 'Funding inventory' },
  { id: 'fashion', label: 'Fashion', detail: 'Shooting a lookbook' },
] as const;

const scenarios = [
  {
    id: 'soft-reminder',
    label: 'Soft Reminder',
    badge: 'Friendly follow-up',
    description: 'Short-term billing hiccup with empathy and clarity.',
  },
  {
    id: 'hard-urgent',
    label: 'Hard Urgent',
    badge: 'Action needed',
    description: 'Direct response for expired or blocked cards.',
  },
  {
    id: 'final-winback',
    label: 'Final Winback',
    badge: 'Pause or update',
    description: 'Final recovery touch with flexible off-ramp options.',
  },
] as const;

const stats = {
  recoveryRate: '75%',
  roi: '9.39x',
  activeAccounts: '1.2K',
};

export default function DemoLandingPage() {
  const [email, setEmail] = useState('');
  const [industry, setIndustry] = useState<(typeof industries)[number]['id']>('real_estate');
  const [scenario, setScenario] = useState<(typeof scenarios)[number]['id']>('soft-reminder');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedIndustry = useMemo(
    () => industries.find((item) => item.id === industry) ?? industries[0],
    [industry],
  );

  const selectedScenario = useMemo(
    () => scenarios.find((item) => item.id === scenario) ?? scenarios[0],
    [scenario],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Please enter an email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, industry, scenario }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to send the demo email.');
      }

      setSuccess(
        payload?.message ??
          `Demo email queued for ${email}. Check your inbox in a few minutes.`,
      );
      setEmail('');
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Something went wrong.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 text-sm font-bold text-slate-950">
              W
            </div>
            <div>
              <div className="text-xl font-semibold">worklane</div>
              <div className="text-[10px] uppercase tracking-[0.32em] text-slate-400">dunning demo</div>
            </div>
          </div>
          <a
            href="/"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            Back to app
          </a>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-teal-200">
              Interactive demo
            </div>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              See the exact dunning email your customers would receive.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Enter your email, pick your industry, and preview the recovery message built for
              the customer journey behind failed subscription payments.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Recovery rate</div>
                <div className="mt-3 text-3xl font-semibold text-white">{stats.recoveryRate}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">ROI</div>
                <div className="mt-3 text-3xl font-semibold text-white">{stats.roi}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Accounts</div>
                <div className="mt-3 text-3xl font-semibold text-white">{stats.activeAccounts}</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/50">
            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-teal-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Industry</label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {industries.map((item) => {
                    const active = item.id === industry;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIndustry(item.id)}
                        className={`rounded-2xl border p-3 text-left transition ${
                          active
                            ? 'border-teal-500 bg-teal-500/10 text-white'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="text-sm font-semibold">{item.label}</div>
                        <div className="mt-2 text-[11px] text-slate-400">{item.detail}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Scenario</label>
                <div className="space-y-3">
                  {scenarios.map((item) => {
                    const active = item.id === scenario;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setScenario(item.id)}
                        className={`flex w-full items-start justify-between rounded-2xl border p-3 text-left transition ${
                          active
                            ? 'border-orange-400 bg-orange-500/10 text-white'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{item.label}</div>
                          <div className="mt-1 text-xs text-slate-400">{item.description}</div>
                        </div>
                        <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                          {item.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Sending demo...' : 'Generate my email'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">Preview</div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5 text-sm leading-7 text-slate-300">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-white">{selectedScenario.label}</div>
              <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                Worklane
              </span>
            </div>
            <div>
              Hi {selectedIndustry.label === 'Real Estate' ? 'Sarah' : selectedIndustry.label === 'Ecommerce' ? 'Maya' : 'Lena'},
            </div>
            <div className="mt-2">
              We tried to process your <span className="font-medium text-white">Pro Monthly</span>{' '}
              subscription payment today, but it didn’t go through.
            </div>
            <div className="mt-2 text-teal-300">
              {selectedScenario.id === 'soft-reminder' && 'No worries — this is usually temporary. Whether you are staging a listing, funding inventory, or shooting a lookbook, timing matters.'}
              {selectedScenario.id === 'hard-urgent' && 'Action needed. If your card expired, was lost, or was blocked, update your payment method now so your plan stays active.'}
              {selectedScenario.id === 'final-winback' && 'We know things happen. If you need a pause, a different billing path, or a quick call, we can help you keep the plan working for you.'}
            </div>
            <div className="mt-3 text-slate-400">
              {selectedScenario.id === 'final-winback'
                ? 'Update, pause, or reply to speak with support.'
                : 'Update your payment method or pause your plan in one click.'}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
