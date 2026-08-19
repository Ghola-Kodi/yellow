'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Clock,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

import { DemoModeBanner } from '@/components/dashboard/DemoModeBanner';
import { RecoveryMetricsChart } from '@/components/dashboard/RecoveryMetricsChart';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { WebhookLiveFeed } from '@/components/dashboard/WebhookLiveFeed';
import { Button } from '@/components/ui/Button';
import { useFailedPayments } from '@/hooks/useFailedPayments';
import { useRecoveryMetrics } from '@/hooks/useRecoveryMetrics';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { formatCurrency } from '@/utils/formatCurrency';

import DashboardLayout from './layout';

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { payments, loading: paymentsLoading, refetch } = useFailedPayments();
  const { metrics, loading: metricsLoading } = useRecoveryMetrics(timeRange);
  const { latestEvent } = useSupabaseRealtime('failed_payments');

  const pendingCount = payments?.filter((p) => p.status === 'pending').length || 0;
  const recoveredCount = payments?.filter((p) => p.status === 'recovered').length || 0;
  const recentFailures = payments?.slice(0, 5) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DemoModeBanner />

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-gray-400">
              Real-time overview of your payment recovery performance
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-gray-800/50 p-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`rounded-md px-3 py-1 text-xs transition-colors ${
                    timeRange === range
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="At Risk MRR"
            value={metrics ? formatCurrency(metrics.atRiskMRR) : '$0'}
            change={metrics?.mrrChange || '+0%'}
            changeType={metrics?.mrrChange?.startsWith('+') ? 'increase' : 'decrease'}
            icon={DollarSign}
            loading={metricsLoading}
            description="Monthly recurring revenue at risk"
          />
          <StatsCard
            title="Recovery Rate"
            value={metrics ? `${metrics.recoveryRate}%` : '0%'}
            change={metrics?.recoveryRateChange || '+0%'}
            changeType={metrics?.recoveryRateChange?.startsWith('+') ? 'increase' : 'decrease'}
            icon={TrendingUp}
            loading={metricsLoading}
            description="Percentage of failed payments recovered"
          />
          <StatsCard
            title="Recovered Revenue"
            value={metrics ? formatCurrency(metrics.recoveredRevenue) : '$0'}
            change={`${metrics?.recoveredCount || 0} recoveries`}
            changeType="neutral"
            icon={Wallet}
            loading={metricsLoading}
            description="Total revenue recovered"
          />
          <StatsCard
            title="Active Failures"
            value={pendingCount}
            change={`${recoveredCount} recovered`}
            changeType={pendingCount > 0 ? 'warning' : 'success'}
            icon={Clock}
            loading={paymentsLoading}
            description="Pending payment failures"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <WebhookLiveFeed events={recentFailures} latestEvent={latestEvent} />
          </div>

          <div className="lg:col-span-2">
            <RecoveryMetricsChart timeRange={timeRange} />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between border-b border-gray-800 p-4">
            <div>
              <h3 className="font-semibold text-white">Recent Failed Payments</h3>
              <p className="text-xs text-gray-400">
                Showing the latest {recentFailures.length} failures
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/dashboard/failures">
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                  View All
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {paymentsLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
              <p className="mt-2 text-sm text-gray-400">Loading failures...</p>
            </div>
          ) : recentFailures.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mb-2 text-4xl">🎉</div>
              <p className="text-gray-400">No failed payments yet!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {recentFailures.map((payment) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">{payment.customer_email}</p>
                    <p className="text-xs text-gray-500">{payment.decline_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{formatCurrency(payment.amount / 100)}</p>
                    <p className="text-xs text-gray-500">{payment.status}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

