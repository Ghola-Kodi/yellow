export type PaymentStatus =
  | 'pending'
  | 'retrying'
  | 'sent'
  | 'recovered'
  | 'failed'
  | 'requires_action'
  | 'paused';

export type DeclineType = 'soft' | 'hard';
export type KlaviyoFlowStatus =
  | 'not_sent'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'bounced'
  | 'clicked';

export interface PaymentFailureRecord {
  id: string;
  stripe_event_id?: string | null;
  customer_id?: string | null;
  customer_email: string;
  stripe_customer_id?: string | null;
  amount?: number;
  amount_cents?: number;
  currency?: string;
  status: PaymentStatus;
  decline_type: DeclineType | string;
  decline_code?: string | null;
  attempt_count?: number;
  recovery_status?: string;
  klaviyo_flow_status?: KlaviyoFlowStatus | string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown> | null;
  email_sent_at?: string | null;
  resolved_at?: string | null;
  resolution_method?: string | null;
}

export interface DatabaseSchema {
  payment_failures: PaymentFailureRecord[];
}
