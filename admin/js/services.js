const PAGE_SIZE = 25;

export class ServicesController {
  constructor({
    api,
    onAdd = () => {},
    onOpen = () => {},
    onError = () => {},
  }) {
    this.api = api;
    this.onAdd = onAdd;
    this.onOpen = onOpen;
    this.onError = onError;
    this.offset = 0;
    this.total = 0;
    this.status = "";
    this.hasLoaded = false;
    this.isLoading = false;

    this.elements = {
      status: document.getElementById("serviceStatusFilter"),
      loading: document.getElementById("servicesLoading"),
      error: document.getElementById("servicesError"),
      errorMessage: document.getElementById("servicesErrorMessage"),
      retry: document.getElementById("servicesRetry"),
      empty: document.getElementById("servicesEmpty"),
      tableWrap: document.getElementById("servicesTableWrap"),
      tableBody: document.getElementById("servicesTableBody"),
      pagination: document.getElementById("servicesPagination"),
      range: document.getElementById("servicesRange"),
      total: document.getElementById("servicesTotal"),
      previous: document.getElementById("servicesPrevious"),
      next: document.getElementById("servicesNext"),
    };
  }

  bind() {
    this.elements.status?.addEventListener("change", () => {
      this.status = this.elements.status.value;
      this.offset = 0;
      this.load();
    });

    this.elements.retry?.addEventListener("click", () => this.load());
    this.elements.previous?.addEventListener("click", () => {
      this.offset = Math.max(0, this.offset - PAGE_SIZE);
      this.load();
    });
    this.elements.next?.addEventListener("click", () => {
      if (this.offset + PAGE_SIZE < this.total) {
        this.offset += PAGE_SIZE;
        this.load();
      }
    });

    this.elements.tableBody?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-service-id]");
      if (button) {
        this.onOpen(button.dataset.serviceId);
      }
    });
  }

  async ensureLoaded() {
    if (!this.hasLoaded) {
      await this.load();
    }
  }

  async load() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showState("loading");

    try {
      const response = await this.api.list({
        limit: PAGE_SIZE,
        offset: this.offset,
        status: this.status,
      });

      const services = Array.isArray(response?.data?.services)
        ? response.data.services
        : Array.isArray(response?.data)
          ? response.data
          : [];

      this.total = Number(
        response?.metadata?.total ??
        response?.data?.total ??
        services.length
      );

      if (this.offset > 0 && this.offset >= this.total) {
        this.offset = Math.max(
          0,
          Math.floor(Math.max(this.total - 1, 0) / PAGE_SIZE) * PAGE_SIZE
        );
        this.isLoading = false;
        await this.load();
        return;
      }

      this.render(services);
      this.renderPagination(services.length);
      this.hasLoaded = true;
      this.showState(services.length ? "table" : "empty");
    } catch (error) {
      this.elements.errorMessage.textContent =
        error.message || "The service list could not be loaded.";
      this.showState("error");
      this.onError(error);
    } finally {
      this.isLoading = false;
    }
  }

  render(services) {
    this.elements.tableBody.replaceChildren(
      ...services.map((service) => this.createRow(service))
    );
  }

  createRow(service) {
    const row = document.createElement("tr");
    const clientName = [
      service.client_first_name,
      service.client_last_name,
    ].filter(Boolean).join(" ");

    row.innerHTML = `
      <td data-label="Client">
        <div class="service-client">
          <strong>${escapeHtml(clientName || "Unknown client")}</strong>
          <small>${escapeHtml(
            service.client_email ||
            service.client_phone ||
            service.client_id ||
            ""
          )}</small>
        </div>
      </td>
      <td data-label="Service">
        <strong>${escapeHtml(service.service_type || "Unspecified service")}</strong>
      </td>
      <td data-label="Schedule">${escapeHtml(
        formatSchedule(service.scheduled_start, service.scheduled_end)
      )}</td>
      <td data-label="Status">
        <span class="service-status service-status-${escapeHtml(
          service.status || "unknown"
        )}">
          ${escapeHtml(formatStatus(service.status))}
        </span>
      </td>
      <td data-label="Price">${escapeHtml(formatPrice(service.price_cents))}</td>
      <td class="table-action-cell">
        <button
          class="button button-secondary button-small"
          type="button"
          data-service-id="${escapeHtml(service.id || "")}"
        >
          View
        </button>
      </td>
    `;

    return row;
  }

  renderPagination(returned) {
    const start = this.total === 0 ? 0 : this.offset + 1;
    const end = Math.min(this.offset + returned, this.total);

    this.elements.range.textContent = `Showing ${start}-${end} services`;
    this.elements.total.textContent = `${this.total} total`;
    this.elements.previous.disabled = this.offset === 0;
    this.elements.next.disabled = this.offset + returned >= this.total;
    this.elements.pagination.hidden = this.total === 0;
  }

  showState(state) {
    this.elements.loading.hidden = state !== "loading";
    this.elements.error.hidden = state !== "error";
    this.elements.empty.hidden = state !== "empty";
    this.elements.tableWrap.hidden = state !== "table";

    if (state !== "table") {
      this.elements.pagination.hidden = true;
    }
  }
}

function formatStatus(value) {
  return String(value || "Unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSchedule(startValue, endValue) {
  if (!startValue) return "Not scheduled";

  const start = parseDate(startValue);
  if (!start) return String(startValue);

  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(start);

  const startTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(start);

  if (!endValue) return `${date} at ${startTime}`;

  const end = parseDate(endValue);
  if (!end) return `${date} at ${startTime}`;

  const endTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(end);

  return `${date}, ${startTime}-${endTime}`;
}

function parseDate(value) {
  const text = String(value || "");
  const normalized = text.includes("T")
    ? text
    : `${text.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }

  const cents = Number(value);
  if (!Number.isFinite(cents)) return "Not set";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
