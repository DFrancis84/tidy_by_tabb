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

    return this.request(
      "clients.list",
      url,
      { method: "GET" }
    );
  }

  async detail(clientId) {
    const id = requireClientId(clientId);

    return this.request(
      "clients.detail",
      `${CLIENTS_API_URL}/${encodeURIComponent(id)}`,
      { method: "GET" }
    );
  }

  async create(client) {
    return this.request(
      "clients.create",
      CLIENTS_API_URL,
      {
        method: "POST",
        body: JSON.stringify(client),
      }
    );
  }

  async update(clientId, client) {
    const id = requireClientId(clientId);

    return this.request(
      "clients.update",
      `${CLIENTS_API_URL}/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(client),
      }
    );
  }

  async delete(clientId, version) {
    const id = requireClientId(clientId);

    return this.request(
      "clients.delete",
      `${CLIENTS_API_URL}/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        body: JSON.stringify({ version }),
      }
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
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
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
            `Client request failed (${response.status}).`
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

function requireClientId(value) {
  const clientId = String(value || "").trim();

  if (!clientId) {
    throw new Error("A client ID is required.");
  }

  return clientId;
}
