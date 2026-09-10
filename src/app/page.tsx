// app/page.tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Mail,
  CreditCard,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060b17] text-slate-100">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-800/70 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-400 to-amber-300 text-slate-950 shadow-lg shadow-orange-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Revivo</p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Stripe + Klaviyo demo</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate-300 transition hover:text-white">
              Sign In
            </Link>
            <Link href="/signup" className="rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-28">
        <section className="relative overflow-hidden px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="relative z-10"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-200 shadow-sm shadow-orange-500/10">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-orange-400 animate-pulse" />
                Built for friction-free recovery workflows
              </div>

              <h1 className="mt-8 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Recover failed payments with a modern dashboard that puts action first.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                A clean Stripe + Klaviyo recovery workflow that highlights opportunities, removes noise, and helps you win back revenue faster.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-orange-500 px-8 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-orange-500/20 transition hover:bg-orange-400"
                >
                  Launch Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-full border border-teal-500/40 bg-teal-500/10 px-8 py-3 text-sm font-medium text-teal-100 transition hover:border-teal-400 hover:bg-teal-500/20"
                >
                  Worklane Landing Demo
                </Link>
                <Link
                  href="/dashboard/simulator"
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 px-8 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
                >
                  Try Simulator
                </Link>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/80 p-6">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Recovered revenue</p>
                  <p className="mt-3 text-3xl font-semibold text-white">$8.4K</p>
                  <p className="mt-2 text-sm text-slate-400">Generated in the last 30 days</p>
                </div>
                <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/80 p-6">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Recovery rate</p>
                  <p className="mt-3 text-3xl font-semibold text-white">68%</p>
                  <p className="mt-2 text-sm text-slate-400">Automatic follow-ups and clear next actions</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative mx-auto w-full max-w-3xl"
            >
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/95 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-orange-500/10 to-transparent" />
                <div className="relative rounded-[1.75rem] border border-slate-800 bg-[#0f172a] p-6 shadow-[0_35px_80px_-40px_rgba(15,23,42,0.85)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Live Overview</p>
                      <p className="mt-3 text-3xl font-semibold text-white">$1.2K</p>
                    </div>
                    <div className="rounded-3xl bg-slate-900/90 px-4 py-2 text-sm text-slate-200">
                      Active <span className="ml-2 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-950/90 p-5 text-slate-300">
                      <p className="text-sm">Soft decline recoveries</p>
                      <p className="mt-3 text-xl font-semibold text-white">72%</p>
                    </div>
                    <div className="rounded-3xl bg-slate-950/90 p-5 text-slate-300">
                      <p className="text-sm">Pending failures</p>
                      <p className="mt-3 text-xl font-semibold text-orange-400">23</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-slate-800 bg-slate-950/90 p-5">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Webhook feed</span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1 text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-orange-400" />
                      Live
                    </span>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <div className="flex items-center justify-between rounded-3xl bg-slate-900/80 px-4 py-3">
                      <span>demo@acme.com</span>
                      <span className="text-orange-400">soft decline</span>
                    </div>
                    <div className="flex items-center justify-between rounded-3xl bg-slate-900/80 px-4 py-3">
                      <span>client@techcorp.com</span>
                      <span className="text-rose-400">hard decline</span>
                    </div>
                    <div className="flex items-center justify-between rounded-3xl bg-slate-900/80 px-4 py-3">
                      <span>user@startup.io</span>
                      <span className="text-emerald-400">recovered ✓</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute -bottom-6 right-6 hidden rounded-full border border-orange-500/20 bg-slate-950/95 px-4 py-2 text-sm text-orange-300 shadow-lg shadow-black/30 sm:flex">
                Track the main recovery CTA
                <ArrowRight className="h-4 w-4" />
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-slate-800 bg-slate-950/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.8)] sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500">High-impact results</p>
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">Designed to reduce decision friction and guide visitors to the CTA.</h2>
              <p className="text-base leading-8 text-slate-400">A strong Z-pattern layout keeps the most important actions in the top-left and bottom-right while using visual cues to carry the eye naturally through the page.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.7rem] border border-slate-800 bg-slate-900/90 p-6">
                <p className="text-sm text-slate-500">Setup time</p>
                <p className="mt-3 text-2xl font-semibold text-white">Under 10 minutes</p>
              </div>
              <div className="rounded-[1.7rem] border border-slate-800 bg-slate-900/90 p-6">
                <p className="text-sm text-slate-500">No credit card</p>
                <p className="mt-3 text-2xl font-semibold text-white">Live demo ready</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 border-t border-slate-800/60 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-12">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500">What this workflow delivers</p>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">A simpler flow from failed payment to recovery</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-400">Clear cards, bold CTA contrast, and step-by-step flow details make the product feel trustworthy and easy to act on.</p>
            </div>

            <div className="grid gap-6 xl:grid-cols-4 lg:grid-cols-2">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-[1.75rem] border border-slate-800 bg-slate-950/90 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.9)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-orange-500/10 text-orange-300">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{feature.description}</p>
                  <div className="mt-5 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    {feature.timing}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-slate-950/90 border-t border-slate-800/60 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">How it works</h2>
              <p className="mx-auto mt-3 max-w-2xl text-base leading-8 text-slate-400">Each step is clear, directional, and designed to keep your visitor focused on the recovery flow.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="relative rounded-[1.75rem] border border-slate-800 bg-slate-900/95 p-7 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.9)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300">
                      <span className="font-semibold">{index + 1}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-400">{step.description}</p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
                    <step.tech className="h-4 w-4 text-slate-300" />
                    {step.techName}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="absolute top-1/2 right-[-18px] hidden h-10 w-10 items-center justify-center rounded-full bg-slate-900/90 text-slate-500 md:flex">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 border-t border-slate-800/60 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Final CTA</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Ready to see the recovery flow live?</h2>
            <p className="mt-4 text-base leading-8 text-slate-400">The interface is designed to reduce friction, highlight the main CTA, and make every decision feel clear.</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-orange-500 px-10 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-orange-500/20 transition hover:bg-orange-400"
              >
                View live demo
              </Link>
              <Link
                href="/dashboard/simulator"
                className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 px-10 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
              >
                Open simulator
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/60 bg-slate-950/90 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-400 to-amber-300 text-slate-950 shadow-lg shadow-orange-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Revivo Demo</p>
              <p className="text-sm text-slate-500">Stripe + Klaviyo recovery dashboard</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
            <span>Live demo</span>
            <span>Stripe test mode</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Connected
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Mail,
    title: 'Gentle Reminder',
    description: 'Friendly email sent immediately for soft declines so recovery stays smooth.',
    timing: 'Immediate'
  },
  {
    icon: AlertCircle,
    title: 'Action Prompts',
    description: 'Clear follow-up notifications that remove doubt and move customers toward payment.',
    timing: '+6 hours'
  },
  {
    icon: CreditCard,
    title: 'Decline Tracking',
    description: 'Hard and soft declines are segmented for faster decision-making.',
    timing: '+24 hours'
  },
  {
    icon: TrendingUp,
    title: 'Revenue Visibility',
    description: 'See the impact of recoveries in one place with conversion-focused metrics.',
    timing: '+72 hours'
  }
];

const steps = [
  {
    title: 'Stripe Webhook',
    description: 'Stripe sends the failure event and customer data instantly.',
    tech: CreditCard,
    techName: 'Stripe API'
  },
  {
    title: 'Flow Selection',
    description: 'Smart logic maps every decline to the right recovery message.',
    tech: BarChart3,
    techName: 'Recovery Rules'
  },
  {
    title: 'Klaviyo Event',
    description: 'Klaviyo receives the event and triggers the email flow automatically.',
    tech: Mail,
    techName: 'Klaviyo API'
  }
];

const techStack = [
  { name: 'Next.js 14', icon: Zap },
  { name: 'TypeScript', icon: Shield },
  { name: 'Supabase', icon: BarChart3 },
  { name: 'Stripe', icon: CreditCard },
  { name: 'Klaviyo', icon: Mail },
  { name: 'Tailwind', icon: Sparkles }
];
