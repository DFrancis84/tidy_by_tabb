const PAGE_SIZE = 25;
const SEARCH_DELAY_MS = 300;

export class ClientsController {
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

    this.search = "";
    this.offset = 0;
    this.total = 0;
    this.hasLoaded = false;
    this.isLoading = false;
    this.searchTimer = null;

    this.elements = {
      search: document.getElementById("clientSearch"),
      clear: document.getElementById("clientSearchClear"),
      loading: document.getElementById("clientsLoading"),
      error: document.getElementById("clientsError"),
      errorMessage: document.getElementById(
        "clientsErrorMessage"
      ),
      retry: document.getElementById("clientsRetry"),
      empty: document.getElementById("clientsEmpty"),
      tableWrap: document.getElementById(
        "clientsTableWrap"
      ),
      tableBody: document.getElementById(
        "clientsTableBody"
      ),
      pagination: document.getElementById(
        "clientsPagination"
      ),
      range: document.getElementById("clientsRange"),
      total: document.getElementById("clientsTotal"),
      previous: document.getElementById(
        "clientsPrevious"
      ),
      next: document.getElementById("clientsNext"),
    };
  }

  bind() {
    this.elements.search?.addEventListener(
      "input",
      () => {
        clearTimeout(this.searchTimer);

        this.searchTimer = setTimeout(() => {
          this.search =
            this.elements.search.value.trim();
          this.offset = 0;
          this.load();
        }, SEARCH_DELAY_MS);

        this.updateClearButton();
      }
    );

    this.elements.search?.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter") {
          return;
        }

        event.preventDefault();
        clearTimeout(this.searchTimer);
        this.search =
          this.elements.search.value.trim();
        this.offset = 0;
        this.load();
      }
    );

    this.elements.clear?.addEventListener(
      "click",
      () => {
        this.elements.search.value = "";
        this.search = "";
        this.offset = 0;
        this.updateClearButton();
        this.load();
        this.elements.search.focus();
      }
    );

    this.elements.retry?.addEventListener(
      "click",
      () => this.load()
    );

    this.elements.previous?.addEventListener(
      "click",
      () => {
        this.offset = Math.max(
          0,
          this.offset - PAGE_SIZE
        );
        this.load();
      }
    );

    this.elements.next?.addEventListener(
      "click",
      () => {
        if (
          this.offset + PAGE_SIZE <
          this.total
        ) {
          this.offset += PAGE_SIZE;
          this.load();
        }
      }
    );

    this.elements.tableBody?.addEventListener(
      "click",
      (event) => {
        const button = event.target.closest(
          "[data-client-id]"
        );

        if (!button) {
          return;
        }

        this.onOpen(button.dataset.clientId);
      }
    );

    this.updateClearButton();
  }

  async ensureLoaded() {
    if (!this.hasLoaded) {
      await this.load();
    }
  }

  async load() {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.showState("loading");

    try {
      const response = await this.api.list({
        search: this.search,
        limit: PAGE_SIZE,
        offset: this.offset,
      });

      const clients = Array.isArray(
        response?.data?.clients
      )
        ? response.data.clients
        : [];

      this.total = Number(
        response?.metadata?.total || 0
      );

      if (
        this.offset > 0 &&
        this.offset >= this.total
      ) {
        this.offset = Math.max(
          0,
          this.total - PAGE_SIZE
        );
        return await this.load();
      }

      this.render(clients);
      this.renderPagination(clients.length);
      this.hasLoaded = true;

      this.showState(
        clients.length ? "table" : "empty"
      );
    } catch (error) {
      this.elements.errorMessage.textContent =
        error.message ||
        "The client directory could not be loaded.";

      this.showState("error");
      this.onError(error);
    } finally {
      this.isLoading = false;
    }
  }

  render(clients) {
    this.elements.tableBody.replaceChildren(
      ...clients.map((client) =>
        this.createRow(client)
      )
    );
  }

  createRow(client) {
    const row = document.createElement("tr");

    const name = [
      client.first_name,
      client.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    const location = [
      client.city,
      client.state,
    ]
      .filter(Boolean)
      .join(", ");

    row.innerHTML = `
      <td data-label="Client">
        <div class="client-identity">
          <span class="client-avatar">
            ${escapeHtml(initials(name))}
          </span>
          <div>
            <strong>${escapeHtml(name || "Unnamed client")}</strong>
            <small>${escapeHtml(client.id || "")}</small>
          </div>
        </div>
      </td>
      <td data-label="Contact">
        <div class="client-contact">
          <span>${escapeHtml(client.email || "No email")}</span>
          <small>${escapeHtml(client.phone || "No phone")}</small>
        </div>
      </td>
      <td data-label="Location">
        ${escapeHtml(location || "Not provided")}
      </td>
      <td data-label="Updated">
        ${escapeHtml(formatDate(client.updated_at))}
      </td>
      <td class="table-action-cell">
        <button
          class="button button-secondary button-small"
          type="button"
          data-client-id="${escapeHtml(client.id || "")}"
        >
          View
        </button>
      </td>
    `;

    return row;
  }

  renderPagination(returned) {
    const start =
      this.total === 0 ? 0 : this.offset + 1;

    const end = Math.min(
      this.offset + returned,
      this.total
    );

    this.elements.range.textContent =
      this.search
        ? `Showing ${start}-${end} matching clients`
        : `Showing ${start}-${end} clients`;

    this.elements.total.textContent =
      `${this.total} total`;

    this.elements.previous.disabled =
      this.offset === 0;

    this.elements.next.disabled =
      this.offset + returned >= this.total;

    this.elements.pagination.hidden =
      this.total === 0;
  }

  updateClearButton() {
    this.elements.clear.hidden =
      !this.elements.search?.value;
  }

  showState(state) {
    this.elements.loading.hidden =
      state !== "loading";
    this.elements.error.hidden =
      state !== "error";
    this.elements.empty.hidden =
      state !== "empty";
    this.elements.tableWrap.hidden =
      state !== "table";

    if (state !== "table") {
      this.elements.pagination.hidden = true;
    }
  }
}

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const normalized = String(value).includes("T")
    ? String(value)
    : `${value}Z`.replace(" Z", "Z");

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
