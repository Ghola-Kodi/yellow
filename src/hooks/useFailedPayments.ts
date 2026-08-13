'use client';

import { useEffect } from 'react';
import { paymentStore } from '@/stores/paymentStore';

export function useFailedPayments() {
  const payments = paymentStore((state) => state.payments);
  const loading = paymentStore((state) => state.loading);
  const error = paymentStore((state) => state.error);
  const fetchPayments = paymentStore((state) => state.fetchPayments);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    payments,
    loading,
    error,
    refetch: fetchPayments,
  };
}
