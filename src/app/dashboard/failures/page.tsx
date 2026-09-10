import Link from 'next/link';
import { ArrowLeft, Clock, CreditCard, ShieldCheck } from 'lucide-react';

export default function FailureDetailPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/dashboard/failures" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to failures
        </Link>

        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/90 p-8 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Failure detail</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Payment failure #demo1234</h1>
              <p className="mt-2 text-sm text-slate-400">Review the recovery timeline and next recommended action for this customer.</p>
            </div>
            <div className="rounded-3xl bg-slate-950/90 px-5 py-4 text-sm text-slate-300 border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400">
                <ShieldCheck className="h-4 w-4" /> Demo status
              </div>
              <p className="mt-2 text-white">No real data</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Customer</p>
              <p className="text-lg font-semibold text-white">demo@admin.cpm</p>
              <p className="text-sm text-slate-400">Acme Corp • 4 subscription attempts</p>
            </div>
            <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Status</p>
              <p className="text-lg font-semibold text-yellow-400">Pending recovery</p>
              <p className="text-sm text-slate-400">Soft decline detected 12 minutes ago</p>
            </div>
            <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Amount</p>
              <p className="text-3xl font-semibold text-white">$120</p>
              <p className="text-sm text-slate-400">Automatic retry scheduled</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <p className="text-sm font-medium text-slate-300">Recovery timeline</p>
            <div className="mt-6 space-y-4">
              {['Payment failed', 'Retry attempted', 'Email sent', 'Recovery completed'].map((step, index) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-500" />
                  <div>
                    <p className="text-sm text-white font-semibold">{step}</p>
                    <p className="text-xs text-slate-500">{index === 0 ? 'Just now' : `${index * 4 + 4} minutes later`}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
