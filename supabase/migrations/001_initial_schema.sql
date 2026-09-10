CREATE TABLE IF NOT EXISTS payment_failures (
  id UUID PRIMARY KEY,
  stripe_event_id TEXT,
  customer_id TEXT,
  amount NUMERIC,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
