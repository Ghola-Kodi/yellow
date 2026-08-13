declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export function createClient(url: string, key: string, options?: Record<string, unknown>): {
    from: (table: string) => {
      insert: (payload: Record<string, unknown>) => Promise<{ error?: unknown; data?: unknown }>;
      select: (...args: unknown[]) => { eq: (...args: unknown[]) => { limit: (...args: unknown[]) => { maybeSingle: () => Promise<{ data?: unknown; error?: unknown }> } } };
    };
  };
}

declare const Deno: {
  env: {
    get: (name: string) => string | undefined;
  };
  serve: (handler: (request: Request) => Promise<Response>) => void;
};
