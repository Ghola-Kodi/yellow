const KLAVIYO_REVISION = '2024-10-15'; // Use a known stable revision

export const klaviyoClient = {
  async post(path: string, body: Record<string, unknown>) {
    if (!klaviyoPrivateKey) {
      console.warn('⚠️ Klaviyo call skipped — KLAVIYO_PRIVATE_API_KEY not set');
      return { ok: false, status: 0, skipped: true };
    }

    // Ensure trailing slash to avoid redirect issues
    const url = `https://a.klaviyo.com/api/${path.replace(/\/?$/, '/')}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Klaviyo-API-Key ${klaviyoPrivateKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        revision: KLAVIYO_REVISION,
      },
      body: JSON.stringify(body),
    });

    return {
      ok: response.ok,
      status: response.status,
      json: () => response.json(),
    };
  },
};
