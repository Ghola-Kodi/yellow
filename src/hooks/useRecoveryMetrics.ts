import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

const baseMetrics = {
  atRiskMRR: 0,
  recoveryRate: 0,
  recoveredRevenue: 0,
  recoveredCount: 0,
  mrrChange: '+0%',
  recoveryRateChange: '+0%',
};

export function useRecoveryMetrics(timeRange: '7d' | '30d' | '90d') {
  const [metrics, setMetrics] = useState(baseMetrics);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);

      try {
        let headers: Record<string, string> = {};
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            headers = { Authorization: `Bearer ${token}` };
          }
        }

        const response = await fetch('/api/metrics', { headers });

        if (response.status === 401) {
          if (!ignore) {
            setMetrics(baseMetrics);
          }
          return;
        }

        const json = await response.json();
        if (!ignore) {
          const data = json.metrics ?? baseMetrics;
          setMetrics({
            ...baseMetrics,
            ...data,
            atRiskMRR: Number(data.atRiskMRR ?? 0),
            recoveredRevenue: Number(data.recoveredRevenue ?? 0),
            recoveredCount: Number(data.recoveredCount ?? 0),
            recoveryRate: Number(data.recoveryRate ?? 0),
          });
        }
      } catch {
        if (!ignore) {
          setMetrics(baseMetrics);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [timeRange]);

  return {
    metrics,
    loading,
  };
}
