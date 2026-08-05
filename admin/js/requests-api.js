window.RequestsApi = (() => {
  const BASE = "/admin/api/cleaning-requests";

  async function request(path = "", options = {}) {
    const response = await fetch(`${BASE}${path}`, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    let body;

    try {
      body = await response.json();
    } catch {
      throw new Error(
        `The server returned an unreadable response (${response.status}).`
      );
    }

    if (!response.ok || body?.success !== true) {
      const error = new Error(
        body?.message ||
          `Request failed (${response.status}).`
      );
      error.status = response.status;
      error.body = body;
      throw error;
    }

    return body;
  }

  return {
    list(params = {}) {
      const query = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          query.set(key, value);
        }
      });

      return request(
        query.toString() ? `?${query}` : ""
      );
    },

    detail(id) {
      return request(`/${encodeURIComponent(id)}`);
    },

    update(id, payload) {
      return request(`/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    convert(id, payload) {
      return request(
        `/${encodeURIComponent(id)}/convert`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
    },
  };
})();
