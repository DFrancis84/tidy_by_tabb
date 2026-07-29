const API_URL = "https://script.google.com/macros/s/AKfycbyLkwoj-c2DqYWpLNaYOgsZi9_FqgvMQm-7a2Zis8TA5zpRDKY6TK4RXtistJV873gw/exec";

export class GalleryApi {
  constructor(onRequest = () => {}) {
    this.onRequest = onRequest;
  }

  async list() {
    return this.request("list", "GET", null, {
      published: "all",
    });
  }

  async diagnostics() {
    return this.request("diagnostics");
  }

  async create(record) {
    return this.request("create", "POST", {
      action: "create",
      record,
    });
  }

  async update(id, record) {
    return this.request("update", "POST", {
      action: "update",
      id,
      record,
    });
  }

  async delete(id, { deleteFiles = {} } = {}) {
    const recordId = String(id || "").trim();

    if (!recordId) {
      throw new Error("A gallery record ID is required.");
    }

    return this.request("delete", "POST", {
      action: "delete",
      id: recordId,
      payload: {
        id: recordId,
        deleteFiles: {
          beforeImage: Boolean(deleteFiles.beforeImage),
          afterImage: Boolean(deleteFiles.afterImage),
          comparisonImage: Boolean(deleteFiles.comparisonImage),
        },
      },
    });
  }

  async uploadImage(payload) {
    return this.request("uploadImage", "POST", {
      action: "uploadImage",
      payload,
    });
  }

  async getImageData(url) {
    return this.request(
      "imageData",
      "GET",
      null,
      { url }
    );
  }

  async request(
    action,
    method = "GET",
    body = null,
    query = {}
  ) {
    if (API_URL.includes("PASTE_YOUR")) {
      throw new Error(
        "Set your deployed Apps Script /exec URL in js/api.js."
      );
    }

    const url = new URL(API_URL);
    url.searchParams.set("action", action);

    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const started = performance.now();
    let response;
    let payload;

    try {
      response = await fetch(url, {
        method,
        headers:
          method === "POST"
            ? { "Content-Type": "text/plain;charset=utf-8" }
            : undefined,
        body:
          method === "POST"
            ? JSON.stringify(body)
            : undefined,
        redirect: "follow",
      });

      payload = await response.json();

      const duration = Math.round(
        performance.now() - started
      );

      this.onRequest({
        action,
        method,
        duration,
        status: response.status,
        success: Boolean(payload?.success),
        response: payload,
      });

      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message ||
            `Request failed (${response.status}).`
        );
      }

      return payload;
    } catch (error) {
      this.onRequest({
        action,
        method,
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
