import React from 'react';

type WebhookLiveFeedProps = {
  events: any[];
  latestEvent: any;
};

export function WebhookLiveFeed({ events, latestEvent }: WebhookLiveFeedProps) {
  return (
    <div className="rounded-3xl border border-gray-800 bg-slate-950/80 p-5 shadow-sm shadow-black/10">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <p className="text-sm font-medium text-white">Webhook live feed</p>
          <p className="text-xs text-slate-500">Most recent payment events</p>
        </div>
        <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
          {events.length} items
        </span>
      </div>

      <div className="space-y-3">
        {latestEvent ? (
          <div className="rounded-3xl bg-slate-900/80 p-4 border border-slate-800">
            <p className="text-sm text-slate-400">Latest event</p>
            <p className="mt-2 text-sm text-white font-medium">{latestEvent.customer_email}</p>
            <p className="text-xs text-slate-500 mt-1">{latestEvent.status}</p>
          </div>
        ) : (
          <div className="rounded-3xl bg-slate-900/80 p-4 text-slate-500">No recent events</div>
        )}

        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} className="rounded-3xl bg-slate-900/80 p-4 border border-slate-800">
              <div className="flex items-center justify-between gap-2 text-sm text-slate-400">
                <span>{event.customer_email}</span>
                <span>{new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{event.decline_type || 'soft decline'}</p>
            </div>
          ))
        ) : (
          <div className="rounded-3xl bg-slate-900/80 p-4 text-slate-500">Waiting for webhook events...</div>
        )}
      </div>
    </div>
  );
}
