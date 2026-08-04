const SERVICES_API_URL = "/admin/api/services";

export class ServiceApi {
  constructor(onRequest = () => {}) {
    this.onRequest = onRequest;
  }

  async list({
    limit = 25,
    offset = 0,
    status = "",
  } = {}) {
    const url = new URL(
      SERVICES_API_URL,
      window.location.origin
    );

    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    if (status) {
      url.searchParams.set("status", status);
    }

    return this.request(
      "services.list",
      url,
      { method: "GET" }
    );
  }

  async request(action, url, options) {
    const started = performance.now();
    let response;
    let payload;

    try {
      response = await fetch(url, {
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
        ...options,
      });

      payload = await response.json();

      this.onRequest({
        action,
        method: options.method,
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
            `Service request failed (${response.status}).`
        );
      }

      return payload;
    } catch (error) {
      this.onRequest({
        action,
        method: options.method,
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
