const CLIENTS_API_URL = "/admin/api/clients";

export class ClientApi {
  constructor(onRequest = () => {}) {
    this.onRequest = onRequest;
  }

  async list({
    search = "",
    limit = 25,
    offset = 0,
  } = {}) {
    const url = new URL(
      CLIENTS_API_URL,
      window.location.origin
    );

    if (search) {
      url.searchParams.set("search", search);
    }

    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const started = performance.now();
    let response;
    let payload;

    try {
      response = await fetch(url, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      payload = await response.json();

      this.onRequest({
        action: "clients.list",
        method: "GET",
        duration: Math.round(
          performance.now() - started
        ),
        status: response.status,
        success: Boolean(payload?.success),
        response: payload,
      });

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message ||
            `Client request failed (${response.status}).`
        );
      }

      return payload;
    } catch (error) {
      this.onRequest({
        action: "clients.list",
        method: "GET",
        duration: Math.round(
          performance.now() - started
        ),
        status: response?.status || 0,
        success: false,
        error: error.message,
        response: payload,
      });

      throw error;
    }
  }
}
