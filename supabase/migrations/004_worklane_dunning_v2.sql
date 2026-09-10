-- ============================================================
-- WORKLANE DUNNING SYSTEM — ENHANCED SCHEMA (v2)
-- Based on user's payment_failures flat table + our vertical seed data
-- Run this as a single block in Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. PROFILES TABLE (normalized — one row per customer)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  industry TEXT NOT NULL CHECK (industry IN ('real_estate', 'ecommerce', 'fashion')),
  company_name TEXT,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  plan_name TEXT NOT NULL DEFAULT 'Worklane Pro',
  plan_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (plan_interval IN ('monthly', 'annual')),
  plan_amount_cents INTEGER NOT NULL DEFAULT 4900,
  card_last4 TEXT DEFAULT '****',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. PAYMENT FAILURES TABLE (your flat table, enhanced)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stripe identifiers
  stripe_event_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  stripe_charge_id TEXT,
  stripe_customer_id TEXT NOT NULL,

  -- Customer info (denormalized for fast lookups, but links to profiles)
  customer_email TEXT NOT NULL,

  -- Financials
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Decline classification (the brain of the router)
  decline_code TEXT NOT NULL,
  decline_type TEXT NOT NULL GENERATED ALWAYS AS (
    CASE 
      WHEN decline_code IN ('insufficient_funds', 'do_not_honor', 'processing_error', 'issuer_not_available', 'try_again_later', 'generic_decline') THEN 'soft'
      WHEN decline_code IN ('expired_card', 'incorrect_cvc', 'incorrect_number', 'lost_card', 'stolen_card', 'fraudulent', 'card_not_supported', 'invalid_account') THEN 'hard'
      ELSE 'unknown'
    END
  ) STORED,
  attempt_count INTEGER NOT NULL DEFAULT 1,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'retrying', 'sent', 'recovered', 'failed', 'requires_action', 'paused')
  ),
  recovery_status TEXT NOT NULL DEFAULT 'pending',

  -- Klaviyo integration
  klaviyo_flow_status TEXT NOT NULL DEFAULT 'not_sent' CHECK (
    klaviyo_flow_status IN ('not_sent', 'queued', 'sent', 'delivered', 'bounced', 'clicked')
  ),
  klaviyo_event_name TEXT,
  email_sent_at TIMESTAMPTZ,

  -- Resolution tracking
  resolved_at TIMESTAMPTZ,
  resolution_method TEXT CHECK (resolution_method IN ('auto_retry', 'customer_updated_card', 'customer_paused', 'customer_canceled', 'support_intervention')),

  -- Flexibility
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_industry ON public.profiles(industry);

CREATE INDEX IF NOT EXISTS idx_payment_failures_status ON public.payment_failures(status);
CREATE INDEX IF NOT EXISTS idx_payment_failures_created_at ON public.payment_failures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_failures_email ON public.payment_failures(customer_email);
CREATE INDEX IF NOT EXISTS idx_payment_failures_customer_id ON public.payment_failures(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_decline_type ON public.payment_failures(decline_type);
CREATE INDEX IF NOT EXISTS idx_payment_failures_klaviyo_status ON public.payment_failures(klaviyo_flow_status);

-- ============================================================
-- 4. AUTO-UPDATE TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_payment_failures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_failures_updated_at ON public.payment_failures;

CREATE TRIGGER trg_payment_failures_updated_at
BEFORE UPDATE ON public.payment_failures
FOR EACH ROW
EXECUTE FUNCTION public.update_payment_failures_updated_at();

-- ============================================================
-- 5. RLS & PERMISSIONS
-- ============================================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_failures DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.profiles TO postgres, anon, authenticated;
GRANT ALL ON public.payment_failures TO postgres, anon, authenticated;

-- ============================================================
-- 6. SEED: 50 REALISTIC PROFILES (industry-specific)
-- ============================================================
INSERT INTO public.profiles (email, first_name, last_name, industry, company_name, stripe_customer_id, plan_name, plan_interval, plan_amount_cents, card_last4)
VALUES
  ('sarah.chen@luxehomes.com', 'Sarah', 'Chen', 'real_estate', 'Luxe Homes Realty', 'cus_real_001', 'Pro Monthly', 'monthly', 4900, '4242'),
  ('david.park@metrorealty.com', 'David', 'Park', 'real_estate', 'Metro Realty Group', 'cus_real_002', 'Pro Annual', 'annual', 47000, '1234'),
  ('maria.gonzalez@coastline.properties', 'Maria', 'Gonzalez', 'real_estate', 'Coastline Properties', 'cus_real_003', 'Pro Monthly', 'monthly', 4900, '5678'),
  ('james.wilson@urbannest.io', 'James', 'Wilson', 'real_estate', 'Urban Nest', 'cus_real_004', 'Pro Monthly', 'monthly', 4900, '9012'),
  ('priya.patel@keyestate.com', 'Priya', 'Patel', 'real_estate', 'Key Estate Partners', 'cus_real_005', 'Pro Annual', 'annual', 47000, '3456'),
  ('robert.kim@skylinebrokers.com', 'Robert', 'Kim', 'real_estate', 'Skyline Brokers', 'cus_real_006', 'Pro Monthly', 'monthly', 9900, '7890'),
  ('lisa.thompson@havenrealty.co', 'Lisa', 'Thompson', 'real_estate', 'Haven Realty', 'cus_real_007', 'Pro Monthly', 'monthly', 4900, '1111'),
  ('ahmed.hassan@oasisproperties.net', 'Ahmed', 'Hassan', 'real_estate', 'Oasis Properties', 'cus_real_008', 'Pro Monthly', 'monthly', 4900, '2222'),
  ('jennifer.lopez@pinnacleestates.com', 'Jennifer', 'Lopez', 'real_estate', 'Pinnacle Estates', 'cus_real_009', 'Pro Annual', 'annual', 47000, '3333'),
  ('michael.brown@cornerstonerealty.io', 'Michael', 'Brown', 'real_estate', 'Cornerstone Realty', 'cus_real_010', 'Pro Monthly', 'monthly', 4900, '4444'),
  ('amanda.foster@greenacreliving.com', 'Amanda', 'Foster', 'real_estate', 'Green Acre Living', 'cus_real_011', 'Pro Monthly', 'monthly', 9900, '5555'),
  ('kevin.oconnor@redroofrealty.com', 'Kevin', 'OConnor', 'real_estate', 'Red Roof Realty', 'cus_real_012', 'Pro Monthly', 'monthly', 4900, '6666'),
  ('natalie.wu@horizonproperties.co', 'Natalie', 'Wu', 'real_estate', 'Horizon Properties', 'cus_real_013', 'Pro Annual', 'annual', 47000, '7777'),
  ('carlos.mendez@solsticerealty.net', 'Carlos', 'Mendez', 'real_estate', 'Solstice Realty', 'cus_real_014', 'Pro Monthly', 'monthly', 4900, '8888'),
  ('rachel.green@parksidehomes.com', 'Rachel', 'Green', 'real_estate', 'Parkside Homes', 'cus_real_015', 'Pro Monthly', 'monthly', 4900, '9999'),
  ('daniel.lee@peakviewestates.io', 'Daniel', 'Lee', 'real_estate', 'Peak View Estates', 'cus_real_016', 'Pro Annual', 'annual', 47000, '0000'),
  ('sophia.martinez@bridgerealty.com', 'Sophia', 'Martinez', 'real_estate', 'Bridge Realty', 'cus_real_017', 'Pro Monthly', 'monthly', 4900, '1212'),
  ('thomas.anderson@highlandhomes.co', 'Thomas', 'Anderson', 'real_estate', 'Highland Homes', 'cus_real_018', 'Pro Monthly', 'monthly', 9900, '3434'),
  ('priya.sharma@quickcart.io', 'Priya', 'Sharma', 'ecommerce', 'QuickCart', 'cus_ecom_001', 'Pro Monthly', 'monthly', 4900, '4545'),
  ('jake.morrison@trendvault.co', 'Jake', 'Morrison', 'ecommerce', 'TrendVault', 'cus_ecom_002', 'Pro Annual', 'annual', 47000, '5656'),
  ('aisha.patel@shoplocal.net', 'Aisha', 'Patel', 'ecommerce', 'ShopLocal', 'cus_ecom_003', 'Pro Monthly', 'monthly', 4900, '6767'),
  ('brandon.chen@dropshippro.com', 'Brandon', 'Chen', 'ecommerce', 'Dropship Pro', 'cus_ecom_004', 'Pro Monthly', 'monthly', 9900, '7878'),
  ('emma.davis@retailrocket.io', 'Emma', 'Davis', 'ecommerce', 'Retail Rocket', 'cus_ecom_005', 'Pro Monthly', 'monthly', 4900, '8989'),
  ('liam.johnson@cartcraft.co', 'Liam', 'Johnson', 'ecommerce', 'CartCraft', 'cus_ecom_006', 'Pro Annual', 'annual', 47000, '9090'),
  ('zara.ali@marketpulse.net', 'Zara', 'Ali', 'ecommerce', 'Market Pulse', 'cus_ecom_007', 'Pro Monthly', 'monthly', 4900, '0101'),
  ('noah.williams@scalestore.com', 'Noah', 'Williams', 'ecommerce', 'ScaleStore', 'cus_ecom_008', 'Pro Monthly', 'monthly', 4900, '2323'),
  ('olivia.brown@conversionlab.io', 'Olivia', 'Brown', 'ecommerce', 'Conversion Lab', 'cus_ecom_009', 'Pro Annual', 'annual', 47000, '4545'),
  ('ethan.miller@stockstream.co', 'Ethan', 'Miller', 'ecommerce', 'StockStream', 'cus_ecom_010', 'Pro Monthly', 'monthly', 9900, '5656'),
  ('ava.garcia@checkoutflow.net', 'Ava', 'Garcia', 'ecommerce', 'Checkout Flow', 'cus_ecom_011', 'Pro Monthly', 'monthly', 4900, '6767'),
  ('lucas.rodriguez@adspend.io', 'Lucas', 'Rodriguez', 'ecommerce', 'AdSpend', 'cus_ecom_012', 'Pro Monthly', 'monthly', 4900, '7878'),
  ('mia.taylor@fulfillmentpro.com', 'Mia', 'Taylor', 'ecommerce', 'Fulfillment Pro', 'cus_ecom_013', 'Pro Annual', 'annual', 47000, '8989'),
  ('benjamin.white@shopifygurus.co', 'Benjamin', 'White', 'ecommerce', 'Shopify Gurus', 'cus_ecom_014', 'Pro Monthly', 'monthly', 4900, '9090'),
  ('charlotte.harris@inventoryiq.net', 'Charlotte', 'Harris', 'ecommerce', 'Inventory IQ', 'cus_ecom_015', 'Pro Monthly', 'monthly', 4900, '1111'),
  ('henry.clark@revenueboost.io', 'Henry', 'Clark', 'ecommerce', 'Revenue Boost', 'cus_ecom_016', 'Pro Annual', 'annual', 47000, '2222'),
  ('isabella.lewis@pixelperfect.com', 'Isabella', 'Lewis', 'ecommerce', 'Pixel Perfect', 'cus_ecom_017', 'Pro Monthly', 'monthly', 9900, '3333'),
  ('alexander.walker@growthhacker.co', 'Alexander', 'Walker', 'ecommerce', 'Growth Hacker', 'cus_ecom_018', 'Pro Monthly', 'monthly', 4900, '4444'),
  ('sofia.hall@brandbuilder.net', 'Sofia', 'Hall', 'ecommerce', 'Brand Builder', 'cus_ecom_019', 'Pro Monthly', 'monthly', 4900, '5555'),
  ('jack.allen@launchpad.io', 'Jack', 'Allen', 'ecommerce', 'LaunchPad', 'cus_ecom_020', 'Pro Annual', 'annual', 47000, '6666'),
  ('marcus.webb@velvetstudio.co', 'Marcus', 'Webb', 'fashion', 'Velvet Studio', 'cus_fash_001', 'Pro Monthly', 'monthly', 4900, '7777'),
  ('chloe.laurent@atelier.mode', 'Chloe', 'Laurent', 'fashion', 'Atelier Mode', 'cus_fash_002', 'Pro Annual', 'annual', 47000, '8888'),
  ('kenji.tanaka@threadlab.com', 'Kenji', 'Tanaka', 'fashion', 'ThreadLab', 'cus_fash_003', 'Pro Monthly', 'monthly', 9900, '9999'),
  ('isabelle.moreau@couturecollective.net', 'Isabelle', 'Moreau', 'fashion', 'Couture Collective', 'cus_fash_004', 'Pro Monthly', 'monthly', 4900, '0000'),
  ('rafael.silva@fabricforward.io', 'Rafael', 'Silva', 'fashion', 'Fabric Forward', 'cus_fash_005', 'Pro Monthly', 'monthly', 4900, '1212'),
  ('yuki.nakamura@stitchandco.com', 'Yuki', 'Nakamura', 'fashion', 'Stitch & Co', 'cus_fash_006', 'Pro Annual', 'annual', 47000, '2323'),
  ('elena.rossi@modamaven.co', 'Elena', 'Rossi', 'fashion', 'Moda Maven', 'cus_fash_007', 'Pro Monthly', 'monthly', 4900, '3434'),
  ('dimitri.petrov@runwayready.net', 'Dimitri', 'Petrov', 'fashion', 'Runway Ready', 'cus_fash_008', 'Pro Monthly', 'monthly', 4900, '4545'),
  ('amara.johnson@textiletrend.io', 'Amara', 'Johnson', 'fashion', 'Textile Trend', 'cus_fash_009', 'Pro Annual', 'annual', 47000, '5656'),
  ('felix.muller@patternworks.com', 'Felix', 'Muller', 'fashion', 'Pattern Works', 'cus_fash_010', 'Pro Monthly', 'monthly', 9900, '6767'),
  ('sakura.yamamoto@kimonocraft.co', 'Sakura', 'Yamamoto', 'fashion', 'Kimono Craft', 'cus_fash_011', 'Pro Monthly', 'monthly', 4900, '7878'),
  ('lucia.fernandez@atelierrosa.net', 'Lucia', 'Fernandez', 'fashion', 'Atelier Rosa', 'cus_fash_012', 'Pro Monthly', 'monthly', 4900, '8989')
ON CONFLICT (stripe_customer_id) DO NOTHING;

-- ============================================================
-- 7. SEED: PAYMENT FAILURES (realistic dunning scenarios)
-- ============================================================
INSERT INTO public.payment_failures (
  stripe_event_id, stripe_invoice_id, stripe_charge_id, stripe_customer_id,
  customer_email, amount_cents, currency, decline_code, attempt_count,
  status, recovery_status, klaviyo_flow_status, klaviyo_event_name,
  email_sent_at, resolved_at, resolution_method, metadata
)
VALUES
  ('evt_1Real001_soft2', 'in_1Real001', 'ch_1Real001', 'cus_real_001',
   'sarah.chen@luxehomes.com', 4900, 'usd', 'insufficient_funds', 2,
   'recovered', 'recovered', 'delivered', 'Dunning Soft Reminder',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', 'auto_retry',
   '{"source":"seed","industry":"real_estate","scenario":"auto_retry_success","notes":"Between property closings, cash flow tight"}'::jsonb),

  ('evt_1Ecom003_soft2', 'in_1Ecom003', 'ch_1Ecom003', 'cus_ecom_003',
   'aisha.patel@shoplocal.net', 4900, 'usd', 'do_not_honor', 2,
   'recovered', 'recovered', 'delivered', 'Dunning Soft Reminder',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days', 'customer_updated_card',
   '{"source":"seed","industry":"ecommerce","scenario":"customer_action","notes":"Bank hold released after 48h, customer updated billing"}'::jsonb),

  ('evt_1Fash001_soft2', 'in_1Fash001', 'ch_1Fash001', 'cus_fash_001',
   'marcus.webb@velvetstudio.co', 4900, 'usd', 'processing_error', 2,
   'retrying', 'retrying', 'sent', 'Dunning Soft Reminder',
   NOW() - INTERVAL '2 days', NULL, NULL,
   '{"source":"seed","industry":"fashion","scenario":"in_progress","notes":"Stripe processing glitch, monitoring for retry"}'::jsonb),

  ('evt_1Real005_soft4', 'in_1Real005', 'ch_1Real005', 'cus_real_005',
   'priya.patel@keyestate.com', 47000, 'usd', 'insufficient_funds', 4,
   'paused', 'paused', 'delivered', 'Dunning Final Winback',
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days', 'customer_paused',
   '{"source":"seed","industry":"real_estate","scenario":"pause_offramp","notes":"Annual plan, customer chose 3-month pause between closings"}'::jsonb),

  ('evt_1Ecom007_soft3', 'in_1Ecom007', 'ch_1Ecom007', 'cus_ecom_007',
   'zara.ali@marketpulse.net', 4900, 'usd', 'generic_decline', 3,
   'recovered', 'recovered', 'delivered', 'Dunning Final Winback',
   NOW() - INTERVAL '9 days', NOW() - INTERVAL '4 days', 'support_intervention',
   '{"source":"seed","industry":"ecommerce","scenario":"support_win","notes":"Customer replied to winback, support helped switch to ACH"}'::jsonb),

  ('evt_1Real002_hard1', 'in_1Real002', 'ch_1Real002', 'cus_real_002',
   'david.park@metrorealty.com', 47000, 'usd', 'expired_card', 1,
   'recovered', 'recovered', 'delivered', 'Dunning Hard Decline',
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', 'customer_updated_card',
   '{"source":"seed","industry":"real_estate","scenario":"fast_recovery","notes":"Customer updated card within 2 hours of hard urgent email"}'::jsonb),

  ('evt_1Ecom001_hard1', 'in_1Ecom001', 'ch_1Ecom001', 'cus_ecom_001',
   'priya.sharma@quickcart.io', 4900, 'usd', 'expired_card', 1,
   'requires_action', 'pending', 'delivered', 'Dunning Hard Decline',
   NOW() - INTERVAL '3 days', NULL, NULL,
   '{"source":"seed","industry":"ecommerce","scenario":"awaiting_action","notes":"Awaiting customer to update expired card"}'::jsonb),

  ('evt_1Real008_hard1', 'in_1Real008', 'ch_1Real008', 'cus_real_008',
   'ahmed.hassan@oasisproperties.net', 4900, 'usd', 'stolen_card', 1,
   'failed', 'failed', 'delivered', 'Dunning Hard Decline',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', 'customer_canceled',
   '{"source":"seed","industry":"real_estate","scenario":"fraud_churn","notes":"Subscription canceled due to fraud flag, no recovery possible"}'::jsonb),

  ('evt_1Ecom012_hard1', 'in_1Ecom012', 'ch_1Ecom012', 'cus_ecom_012',
   'lucas.rodriguez@adspend.io', 4900, 'usd', 'lost_card', 1,
   'requires_action', 'pending', 'sent', 'Dunning Hard Decline',
   NOW() - INTERVAL '5 days', NULL, NULL,
   '{"source":"seed","industry":"ecommerce","scenario":"lost_card","notes":"Customer reported lost card, needs new payment method"}'::jsonb),

  ('evt_1Ecom018_soft1', 'in_1Ecom018', 'ch_1Ecom018', 'cus_ecom_018',
   'alexander.walker@growthhacker.co', 4900, 'usd', 'do_not_honor', 1,
   'retrying', 'retrying', 'not_sent', NULL,
   NULL, NULL, NULL,
   '{"source":"seed","industry":"ecommerce","scenario":"smart_retry","notes":"Attempt 1 — letting Stripe Smart Retries handle silently"}'::jsonb),

  ('evt_1Real014_soft1', 'in_1Real014', 'ch_1Real014', 'cus_real_014',
   'carlos.mendez@solsticerealty.net', 4900, 'usd', 'try_again_later', 1,
   'retrying', 'retrying', 'not_sent', NULL,
   NULL, NULL, NULL,
   '{"source":"seed","industry":"real_estate","scenario":"smart_retry","notes":"Scheduled for optimal retry window by Stripe"}'::jsonb),

  ('evt_1Fash009_soft3', 'in_1Fash009', 'ch_1Fash009', 'cus_fash_009',
   'amara.johnson@textiletrend.io', 47000, 'usd', 'insufficient_funds', 3,
   'paused', 'paused', 'delivered', 'Dunning Final Winback',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days', 'customer_paused',
   '{"source":"seed","industry":"fashion","scenario":"seasonal_pause","notes":"Between fashion seasons, chose pause option, plans to resume SS27"}'::jsonb),

  ('evt_1Ecom015_soft4', 'in_1Ecom015', 'ch_1Ecom015', 'cus_ecom_015',
   'charlotte.harris@inventoryiq.net', 4900, 'usd', 'insufficient_funds', 4,
   'failed', 'failed', 'delivered', 'Dunning Final Winback',
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', 'customer_canceled',
   '{"source":"seed","industry":"ecommerce","scenario":"churn","notes":"No response after winback, subscription lapsed"}'::jsonb),

  ('evt_1Fash003_hard1', 'in_1Fash003', 'ch_1Fash003', 'cus_fash_003',
   'kenji.tanaka@threadlab.com', 9900, 'usd', 'incorrect_cvc', 1,
   'recovered', 'recovered', 'delivered', 'Dunning Hard Decline',
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', 'customer_updated_card',
   '{"source":"seed","industry":"fashion","scenario":"cvc_fix","notes":"Fixed CVC and retry succeeded within minutes"}'::jsonb),

  ('evt_1Ecom010_soft2', 'in_1Ecom010', 'ch_1Ecom010', 'cus_ecom_010',
   'ethan.miller@stockstream.co', 9900, 'usd', 'insufficient_funds', 2,
   'recovered', 'recovered', 'delivered', 'Dunning Soft Reminder',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '6 days', 'auto_retry',
   '{"source":"seed","industry":"ecommerce","scenario":"q4_inventory","notes":"Q4 inventory spend caused temporary shortfall, cleared after 4 days"}'::jsonb)

ON CONFLICT (stripe_event_id) DO NOTHING;

-- ============================================================
-- 8. ANALYTICS VIEWS (for dashboard / portfolio demo)
-- ============================================================

CREATE OR REPLACE VIEW public.dunning_resolution_by_industry AS
SELECT 
  p.industry,
  COUNT(*) as total_failures,
  COUNT(*) FILTER (WHERE pf.status = 'recovered') as recovered_count,
  COUNT(*) FILTER (WHERE pf.status = 'paused') as paused_count,
  COUNT(*) FILTER (WHERE pf.status = 'failed') as churned_count,
  ROUND(COUNT(*) FILTER (WHERE pf.status = 'recovered') * 100.0 / COUNT(*), 1) as recovery_rate_pct,
  AVG(pf.amount_cents) FILTER (WHERE pf.status = 'recovered') as avg_recovered_amount_cents
FROM public.payment_failures pf
JOIN public.profiles p ON pf.stripe_customer_id = p.stripe_customer_id
GROUP BY p.industry;

CREATE OR REPLACE VIEW public.flow_performance AS
SELECT 
  COALESCE(klaviyo_event_name, 'No Email (Smart Retry)') as flow_name,
  COUNT(*) as emails_sent,
  COUNT(*) FILTER (WHERE status = 'recovered') as conversions,
  COUNT(*) FILTER (WHERE status = 'paused') as pauses,
  COUNT(*) FILTER (WHERE status = 'failed') as churn,
  ROUND(COUNT(*) FILTER (WHERE status = 'recovered') * 100.0 / NULLIF(COUNT(*), 0), 1) as conversion_rate_pct,
  AVG(EXTRACT(EPOCH FROM (resolved_at - email_sent_at))/3600) FILTER (WHERE status = 'recovered') as avg_resolution_hours
FROM public.payment_failures
WHERE attempt_count > 1 OR decline_type = 'hard'
GROUP BY klaviyo_event_name;

CREATE OR REPLACE VIEW public.active_dunning_cases AS
SELECT 
  p.first_name,
  p.last_name,
  p.email,
  p.industry,
  p.company_name,
  p.plan_name,
  pf.stripe_invoice_id,
  pf.decline_code,
  pf.decline_type,
  pf.attempt_count,
  pf.amount_cents / 100.0 as amount_due,
  pf.klaviyo_event_name as flow_triggered,
  pf.status,
  pf.klaviyo_flow_status,
  pf.email_sent_at,
  pf.created_at as failure_date,
  pf.metadata->>'notes' as notes
FROM public.payment_failures pf
JOIN public.profiles p ON pf.stripe_customer_id = p.stripe_customer_id
WHERE pf.status IN ('pending', 'retrying', 'requires_action')
ORDER BY pf.created_at DESC;

CREATE OR REPLACE VIEW public.customer_dunning_summary AS
SELECT 
  p.stripe_customer_id,
  p.email,
  p.first_name,
  p.last_name,
  p.industry,
  p.company_name,
  COUNT(pf.id) as total_failures,
  COUNT(pf.id) FILTER (WHERE pf.status = 'recovered') as recovered_count,
  COUNT(pf.id) FILTER (WHERE pf.status = 'failed') as churned_count,
  MAX(pf.created_at) as last_failure_at,
  MAX(pf.resolved_at) FILTER (WHERE pf.status = 'recovered') as last_recovery_at,
  SUM(pf.amount_cents) FILTER (WHERE pf.status = 'recovered') as total_recovered_cents
FROM public.profiles p
LEFT JOIN public.payment_failures pf ON p.stripe_customer_id = pf.stripe_customer_id
GROUP BY p.stripe_customer_id, p.email, p.first_name, p.last_name, p.industry, p.company_name;
