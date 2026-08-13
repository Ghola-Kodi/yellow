'use client';

import { create } from 'zustand';

export type FailedPayment = {
  id: string;
  customer_email: string;
  stripe_customer_id?: string;
  amount: number;
  currency?: string;
  status: string;
  decline_type: string;
  attempt_count?: number;
  recovery_status?: string;
  klaviyo_flow_status?: string;
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, unknown> | null;
};

interface PaymentState {
  payments: FailedPayment[];
  loading: boolean;
  error: string | null;
  fetchPayments: () => Promise<void>;
}

export const paymentStore = create<PaymentState>((set) => ({
  payments: [],
  loading: false,
  error: null,
  fetchPayments: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/failures');
      const data = await response.json();
      set({ payments: data.items || [] });
    } catch (err) {
      set({
        payments: [],
        error: err instanceof Error ? err.message : 'Unable to load failed payments',
      });
    } finally {
      set({ loading: false });
    }
  },
}));
