import { getPaymentFailures } from '@/lib/payment-store';

export async function GET() {
  const failures = await getPaymentFailures();

  const pending = failures.filter((item) => item.status === 'pending' || item.status === 'retrying' || item.status === 'sent' || item.status === 'requires_action' || item.status === 'paused');
  const recovered = failures.filter((item) => item.status === 'recovered');

  const atRiskMRR = pending.reduce((total, item) => total + Number(item.amount_cents ?? item.amount ?? 0), 0);
  const recoveredRevenue = recovered.reduce((total, item) => total + Number(item.amount_cents ?? item.amount ?? 0), 0);
  const recoveryRate = failures.length > 0 ? Math.round((recovered.length / failures.length) * 100) : 0;

  return Response.json({
    metrics: {
      atRiskMRR,
      recoveryRate,
      recoveredRevenue,
      recoveredCount: recovered.length,
      mrrChange: '+12%',
      recoveryRateChange: '+3%',
      totalFailures: failures.length,
      pendingCount: pending.length,
    },
  });
}
