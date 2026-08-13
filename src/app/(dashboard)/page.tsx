// app/(dashboard)/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  RefreshCw,
  Filter,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { useFailedPayments } from '@/hooks/useFailedPayments';
import { useRecoveryMetrics } from '@/hooks/useRecoveryMetrics';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { WebhookLiveFeed } from '@/components/dashboard/WebhookLiveFeed';
import { RecoveryMetricsChart } from '@/components/dashboard/RecoveryMetricsChart';
import { DemoModeBanner } from '@/components/dashboard/DemoModeBanner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/formatCurrency';
import { getRelativeTime } from '@/utils/getRelativeTime';

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { payments, loading: paymentsLoading, refetch } = useFailedPayments();
  const { metrics, loading: metricsLoading } = useRecoveryMetrics(timeRange);
  const { latestEvent } = useSupabaseRealtime('failed_payments');

  // Calculate additional stats
  const pendingCount = payments?.filter(p => p.status === 'pending').length || 0;
  const recoveredCount = payments?.filter(p => p.status === 'recovered').length || 0;
  const recentFailures = payments?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      <DemoModeBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm">
            Real-time overview of your payment recovery performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
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
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Live Feed & Chart Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live Webhook Feed */}
        <div className="lg:col-span-1">
          <WebhookLiveFeed events={recentFailures} latestEvent={latestEvent} />
        </div>

        {/* Recovery Chart */}
        <div className="lg:col-span-2">
          <RecoveryMetricsChart timeRange={timeRange} />
        </div>
      </div>

      {/* Recent Failures Table */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h3 className="text-white font-semibold">Recent Failed Payments</h3>
            <p className="text-xs text-gray-400">
              Showing the latest {recentFailures.length} failures
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
            <Link href="/failures">
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                View All
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {paymentsLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-400 text-sm mt-2">Loading failures...</p>
          </div>
        ) : recentFailures.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-gray-400">No failed payments yet!</p>
            <p className="text-xs text-gray-500 mt-1">
              Try the simulator to trigger a test failure
            </p>
            <Link href="/simulator">
              <Button variant="outline" size="sm" className="mt-4">
                Open Simulator
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Decline Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Attempt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {recentFailures.map((payment) => (
                  <motion.tr 
                    key={payment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-white font-medium">
                          {payment.customer_email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(payment.stripe_customer_id ?? 'demo-customer').slice(0, 8)}...
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {formatCurrency(payment.amount / 100)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant={payment.decline_type === 'soft' ? 'warning' : 'destructive'}
                        className="capitalize"
                      >
                        {payment.decline_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      #{payment.attempt_count}
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant={
                          payment.status === 'recovered' ? 'success' :
                          payment.status === 'sent' ? 'info' :
                          payment.status === 'pending' ? 'warning' :
                          'default'
                        }
                        className="capitalize"
                      >
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {getRelativeTime(payment.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/failures/${payment.id}`}>
                        <Button variant="ghost" size="sm">
                          View →
                        </Button>
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/simulator">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4 hover:border-blue-500/40 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors">
                  Simulator
                </p>
                <p className="text-xs text-gray-400">Test failures</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/failures">
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-4 hover:border-purple-500/40 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Filter className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm group-hover:text-purple-400 transition-colors">
                  All Failures
                </p>
                <p className="text-xs text-gray-400">View history</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/flows">
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-4 hover:border-green-500/40 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm group-hover:text-green-400 transition-colors">
                  Recovery Flows
                </p>
                <p className="text-xs text-gray-400">4-step sequence</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/settings">
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-4 hover:border-yellow-500/40 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm group-hover:text-yellow-400 transition-colors">
                  Settings
                </p>
                <p className="text-xs text-gray-400">Configure flows</p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
