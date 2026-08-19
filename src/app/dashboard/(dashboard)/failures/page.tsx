// app/(dashboard)/failures/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { useFailedPayments } from '@/hooks/useFailedPayments';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { DemoModeBanner } from '@/components/dashboard/DemoModeBanner';
import { formatCurrency } from '@/utils/formatCurrency';
import { getRelativeTime } from '@/utils/getRelativeTime';

const ITEMS_PER_PAGE = 10;

export default function FailuresPage() {
  const { payments, loading, refetch } = useFailedPayments();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort payments
  const filteredPayments = useMemo(() => {
    let filtered = payments || [];

    // Search
    if (search) {
      filtered = filtered.filter((p) => {
        const customerId = p.stripe_customer_id ?? '';
        return (
          p.customer_email.toLowerCase().includes(search.toLowerCase()) ||
          customerId.toLowerCase().includes(search.toLowerCase())
        );
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(p => p.decline_type === typeFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc' 
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        return sortOrder === 'desc' 
          ? b.amount - a.amount
          : a.amount - b.amount;
      }
    });

    return filtered;
  }, [payments, search, statusFilter, typeFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const stats = {
    total: filteredPayments.length,
    pending: filteredPayments.filter(p => p.status === 'pending').length,
    recovered: filteredPayments.filter(p => p.status === 'recovered').length,
    failed: filteredPayments.filter(p => p.status === 'failed').length,
  };

  const handleExport = () => {
    // Export filtered payments as CSV
    const headers = ['Customer Email', 'Amount', 'Decline Type', 'Attempt', 'Status', 'Time'];
    const rows = filteredPayments.map(p => [
      p.customer_email,
      formatCurrency(p.amount / 100),
      p.decline_type,
      p.attempt_count,
      p.status,
      new Date(p.created_at).toLocaleString(),
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Status badge component
  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'warning', icon: Clock, label: 'Pending' },
      sent: { variant: 'info', icon: AlertCircle, label: 'Sent' },
      recovered: { variant: 'success', icon: CheckCircle, label: 'Recovered' },
      failed: { variant: 'destructive', icon: XCircle, label: 'Failed' },
    };
    const config = variants[status] || variants.pending;
    return { ...config, icon: config.icon };
  };

  return (
    <div className="space-y-6">
      <DemoModeBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Failed Payments</h1>
          <p className="text-gray-400 text-sm">
            {filteredPayments.length} total failures • {stats.pending} pending recovery
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            className="flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-lg font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
          <p className="text-xs text-gray-400">Pending</p>
          <p className="text-lg font-bold text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
          <p className="text-xs text-gray-400">Recovered</p>
          <p className="text-lg font-bold text-green-400">{stats.recovered}</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
          <p className="text-xs text-gray-400">Failed</p>
          <p className="text-lg font-bold text-red-400">{stats.failed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by email or customer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-gray-800/50 border-gray-700 text-white w-full"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="recovered">Recovered</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="soft">Soft Decline</option>
            <option value="hard">Hard Decline</option>
          </select>

          <button
            onClick={() => {
              if (sortBy === 'date') {
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              } else {
                setSortBy('date');
                setSortOrder('desc');
              }
            }}
            className="flex items-center gap-1 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
            Sort
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-400 text-sm mt-2">Loading failures...</p>
          </div>
        ) : paginatedPayments.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-gray-400">No failed payments found</p>
            <p className="text-xs text-gray-500 mt-1">
              {search || statusFilter !== 'all' || typeFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'All payments are running smoothly'}
            </p>
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
                {paginatedPayments.map((payment) => {
                  const statusConfig = getStatusBadge(payment.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
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
                      <td className="px-4 py-3">
                        <span className="text-sm text-white font-medium">
                          {formatCurrency(payment.amount / 100)}
                        </span>
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
                        #{payment.attempt_count ?? 1}
                        {(payment.attempt_count ?? 0) > 1 && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({(payment.attempt_count ?? 0) === 3 ? 'Final' : `${payment.attempt_count ?? 1}rd`})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusConfig.variant} className="capitalize flex items-center gap-1 w-fit">
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {getRelativeTime(payment.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/failures/${payment.id}`}>
                          <Button variant="ghost" size="sm" className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <p className="text-sm text-gray-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredPayments.length)} of {filteredPayments.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                })}
                {totalPages > 5 && (
                  <span className="text-gray-500 text-sm">...</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}