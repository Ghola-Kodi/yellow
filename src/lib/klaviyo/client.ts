const klaviyoPublicKey =
  process.env.NEXT_PUBLIC_KLAVIYO_API_KEY ??
  process.env.KLAVIYO_PRIVATE_API_KEY ??
  'pk_Y9LFtc_c4357fbf797a62da75db987ffa4ef90be3';

export const klaviyoClient = {
  async post(path: string, body: Record<string, unknown>) {
    const response = await fetch(`https://a.klaviyo.com/api/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Klaviyo-API-Key ${klaviyoPublicKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return {
      ok: response.ok,
      status: response.status,
      json: async () => response.json(),
    };
  },
};
