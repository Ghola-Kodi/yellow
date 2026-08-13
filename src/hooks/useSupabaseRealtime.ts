import { useEffect, useState } from 'react';

export function useSupabaseRealtime(tableName: string) {
  const [latestEvent, setLatestEvent] = useState<any>(null);

  useEffect(() => {
    const event = {
      id: `evt_${Date.now()}`,
      customer_email: 'demo@admin.cpm',
      amount: 12900,
      status: 'pending',
      created_at: new Date().toISOString(),
      decline_type: 'soft',
    };
    setLatestEvent(event);
  }, [tableName]);

  return { latestEvent };
}
