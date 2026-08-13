import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const allowedIndustries = new Set(['real_estate', 'ecommerce', 'fashion']);
const allowedScenarios = new Set(['soft-reminder', 'hard-urgent', 'final-winback']);

const industryCopy: Record<string, Record<'soft-reminder' | 'hard-urgent' | 'final-winback', string>> = {
  real_estate: {
    'soft-reminder': 'staging a listing',
    'hard-urgent': 'between property closings',
    'final-winback': 'between transactions and deals',
  },
  ecommerce: {
    'soft-reminder': 'funding inventory',
    'hard-urgent': 'between product launches',
    'final-winback': 'during ad spend resets',
  },
  fashion: {
    'soft-reminder': 'shooting a lookbook',
    'hard-urgent': 'balancing seasonal cash flow',
    'final-winback': 'planning the next collection',
  },
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getFallbackProfile(industry: string) {
  const baseProfiles: Record<string, { firstName: string; brand: string; plan: string }> = {
    real_estate: { firstName: 'Sarah', brand: 'Luxe Homes Realty', plan: 'Pro Monthly' },
    ecommerce: { firstName: 'Maya', brand: 'Northstar Commerce', plan: 'Growth Plan' },
    fashion: { firstName: 'Lena', brand: 'Atelier Mode', plan: 'Studio Plan' },
  };

  return baseProfiles[industry] ?? baseProfiles.real_estate;
}

function buildHtmlBody({ email, industry, scenario }: { email: string; industry: string; scenario: string }) {
  const profile = getFallbackProfile(industry);
  const scenarioKey = scenario as keyof typeof industryCopy.real_estate;
  const copyHint = industryCopy[industry]?.[scenarioKey] ?? industryCopy.real_estate['soft-reminder'];
  const titleMap: Record<string, string> = {
    'soft-reminder': 'Quick heads up about your Worklane payment',
    'hard-urgent': 'Action needed: update your billing details',
    'final-winback': 'We still want to help keep your plan active',
  };

  return `
    <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <div style="max-width:620px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0f172a,#0f766e);padding:28px 32px;color:#ffffff;">
            <div style="font-size:28px;font-weight:700;letter-spacing:-0.7px;">worklane</div>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 20px;color:#334155;font-size:18px;">Hi ${profile.firstName},</p>
            <h2 style="margin:0 0 16px;color:#0f172a;font-size:26px;">${titleMap[scenario] ?? titleMap['soft-reminder']}</h2>
            <p style="margin:0 0 12px;color:#475569;line-height:1.6;">
              We tried to process your <strong>${profile.plan}</strong> subscription payment for ${profile.brand}, but it didn’t go through.
            </p>
            <p style="margin:0 0 12px;color:#475569;line-height:1.6;">
              No worries — this is usually temporary, especially when you are <strong>${copyHint}</strong>.
            </p>
            <p style="margin:0 0 20px;color:#475569;line-height:1.6;">
              Update your billing details to keep your plan active and avoid any disruption to your workflow.
            </p>
            <a href="https://worklane.com/billing" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;">Update payment method</a>
          </div>
          <div style="padding:0 32px 28px;color:#64748b;font-size:12px;line-height:1.6;">
            <p><strong>Why you're receiving this:</strong> You are a Worklane subscriber. This is a transactional billing email.</p>
            <p>Worklane, Inc. · 548 Market Street, Suite 12345 · San Francisco, CA 94103</p>
            <p>Privacy rights and unsubscribe: <a href="https://worklane.com/privacy" style="color:#0f766e;">Privacy</a> · Contact privacy@worklane.com</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const industry = typeof payload.industry === 'string' ? payload.industry : 'real_estate';
  const scenario = typeof payload.scenario === 'string' ? payload.scenario : 'soft-reminder';

  if (!email || !isValidEmail(email)) {
    return Response.json({ error: 'Please provide a valid email address.' }, { status: 400 });
  }

  if (!allowedIndustries.has(industry)) {
    return Response.json({ error: 'Unsupported industry.' }, { status: 400 });
  }

  if (!allowedScenarios.has(scenario)) {
    return Response.json({ error: 'Unsupported demo scenario.' }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const profile = supabase
    ? await supabase
        .from('profiles')
        .select('first_name, company_name, plan_name, stripe_customer_id')
        .eq('industry', industry)
        .limit(1)
        .maybeSingle()
    : null;

  const html = buildHtmlBody({ email, industry, scenario });

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'demo@worklane.com';

  if (apiKey) {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Worklane Demo <${fromEmail}>`,
        to: [email],
        subject: `Worklane dunning demo: ${scenario}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      return Response.json({ error: 'Email provider rejected the request.', details: errorBody }, { status: 502 });
    }
  }

  if (supabase) {
    await supabase.from('demo_requests').insert({
      email,
      industry,
      scenario,
      status: apiKey ? 'sent' : 'queued',
      provider: 'resend',
      template_name: scenario,
      sent_at: new Date().toISOString(),
      metadata: {
        source: 'landing-demo',
        profile_match: profile?.data ? true : false,
      },
    });
  }

  return Response.json({
    ok: true,
    message: `Demo email queued for ${email} in the ${industry} ${scenario} flow.`,
    demoMode: !apiKey,
  });
}
