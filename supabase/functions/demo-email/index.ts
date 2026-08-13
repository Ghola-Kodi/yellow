import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedIndustries = new Set(['real_estate', 'ecommerce', 'fashion']);
const allowedScenarios = new Set(['soft-reminder', 'hard-urgent', 'final-winback']);

const industryCopy = {
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
} as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildHtml({ industry, scenario }: { industry: string; scenario: string }) {
  const titleMap = {
    'soft-reminder': 'Quick heads up about your Worklane payment',
    'hard-urgent': 'Action needed: update your billing details',
    'final-winback': 'We still want to help keep your plan active',
  } as const;

  const label = industryCopy[industry as keyof typeof industryCopy]?.[scenario as keyof typeof industryCopy.real_estate] ?? 'staging a listing';

  return `
    <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
        <div style="max-width:620px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0f172a,#0f766e);padding:28px 32px;color:#ffffff;">
            <div style="font-size:28px;font-weight:700;letter-spacing:-0.7px;">worklane</div>
          </div>
          <div style="padding:32px;color:#0f172a;">
            <p style="margin:0 0 20px;font-size:18px;">Hi Sarah,</p>
            <h2 style="margin:0 0 16px;font-size:26px;">${titleMap[scenario as keyof typeof titleMap] ?? titleMap['soft-reminder']}</h2>
            <p style="margin:0 0 12px;line-height:1.6;color:#475569;">
              We tried to process your Worklane Pro subscription payment today, but it didn’t go through.
            </p>
            <p style="margin:0 0 12px;line-height:1.6;color:#475569;">
              No worries — this is usually temporary, especially when you are <strong>${label}</strong>.
            </p>
            <p style="margin:0 0 20px;line-height:1.6;color:#475569;">
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

Deno.serve(async (request: Request) => {
  try {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'demo@worklane.com';

    const html = buildHtml({ industry, scenario });

    if (resendKey) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
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
        return Response.json({ error: 'Unable to send email via Resend.' }, { status: 502 });
      }
    }

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('demo_requests').insert({
        email,
        industry,
        scenario,
        status: resendKey ? 'sent' : 'queued',
        provider: 'resend',
        template_name: scenario,
        metadata: { source: 'supabase-edge-function' },
      });
    }

    return Response.json({ ok: true, message: 'Demo email sent successfully.' });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unexpected server error.' }, { status: 500 });
  }
});
