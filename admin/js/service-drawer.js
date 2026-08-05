const CLIENT_PAGE_SIZE = 100;
const SERVICE_CONFIG_URL =
  "./config/service-options.json?v=20260804-9";

export class ServiceDrawer {
  constructor({
    api,
    clientApi,
    onSaved = () => {},
    onDeleted = () => {},
    onError = () => {},
  }) {
    this.api = api;
    this.clientApi = clientApi;
    this.onSaved = onSaved;
    this.onDeleted = onDeleted;
    this.onError = onError;
    this.isSaving = false;
    this.mode = "create";
    this.serviceId = "";
    this.version = null;
    this.clients = [];
    this.options = {
      serviceTypes: [],
      addOns: [],
    };

    this.injectMarkup();

    this.elements = {
      backdrop: document.getElementById("serviceDrawerBackdrop"),
      drawer: document.getElementById("serviceDrawer"),
      form: document.getElementById("serviceForm"),
      title: document.getElementById("serviceDrawerTitle"),
      subtitle: document.getElementById("serviceDrawerSubtitle"),
      close: document.getElementById("serviceDrawerClose"),
      cancel: document.getElementById("serviceCancel"),
      save: document.getElementById("saveService"),
      delete: document.getElementById("deleteService"),
      loading: document.getElementById("serviceClientLoading"),
      error: document.getElementById("serviceFormError"),
      client: document.getElementById("serviceClientId"),
      type: document.getElementById("serviceType"),
      status: document.getElementById("serviceStatus"),
      start: document.getElementById("serviceScheduledStart"),
      price: document.getElementById("servicePrice"),
      notes: document.getElementById("serviceNotes"),
      addOnList: document.getElementById("serviceAddOnList"),
      addOnSummary: document.getElementById("serviceAddOnSummary"),
    };
  }

  injectMarkup() {
    if (document.getElementById("serviceDrawer")) return;

    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <div id="serviceDrawerBackdrop" class="drawer-backdrop" hidden></div>
        <aside
          id="serviceDrawer"
          class="drawer service-drawer"
          aria-hidden="true"
          aria-labelledby="serviceDrawerTitle"
        >
          <form id="serviceForm">
            <div class="drawer-header">
              <div>
                <p class="eyebrow">Cleaning operations</p>
                <h2 id="serviceDrawerTitle">Add service</h2>
                <small id="serviceDrawerSubtitle" class="drawer-subtitle">
                  Schedule a cleaning service for an active client.
                </small>
              </div>
              <button
                id="serviceDrawerClose"
                class="icon-button"
                type="button"
                aria-label="Close service editor"
              >×</button>
            </div>

            <div class="drawer-body">
              <div id="serviceFormError" class="form-error" role="alert" hidden></div>
              <div id="serviceClientLoading" class="loading-state service-client-loading" hidden>
                Loading service details...
              </div>

              <div class="service-form-grid">
                <label class="field service-field-wide">
                  <span>Client</span>
                  <select id="serviceClientId" required>
                    <option value="">Select a client</option>
                  </select>
                  <small>Only active clients are available.</small>
                </label>

                <label class="field service-field-wide">
                  <span>Service type</span>
                  <select id="serviceType" required>
                    <option value="">Select a service</option>
                  </select>
                </label>

                <div class="field service-field-wide">
                  <span>Add-ons</span>
                  <details class="addon-picker">
                    <summary id="serviceAddOnSummary">Select add-ons</summary>
                    <div id="serviceAddOnList" class="addon-options"></div>
                  </details>
                  <small>Choose any extras requested for this visit.</small>
                </div>

                <label class="field">
                  <span>Status</span>
                  <select id="serviceStatus" required>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>

                <label class="field">
                  <span>Price</span>
                  <div class="money-input">
                    <span aria-hidden="true">$</span>
                    <input
                      id="servicePrice"
                      type="number"
                      inputmode="decimal"
                      min="0"
                      max="1000000"
                      step="0.01"
                      placeholder="Enter price"
                    >
                  </div>
                  <small>Enter the quoted price for this specific job.</small>
                </label>

                <label class="field service-field-wide">
                  <span>Scheduled start</span>
                  <input id="serviceScheduledStart" type="datetime-local" required>
                </label>

                <label class="field service-field-wide">
                  <span>Notes</span>
                  <textarea
                    id="serviceNotes"
                    rows="5"
                    maxlength="5000"
                    placeholder="Access details, requested rooms, supplies, or other service notes"
                  ></textarea>
                </label>
              </div>
            </div>

            <div class="drawer-actions service-drawer-actions">
              <button
                id="deleteService"
                class="button button-danger service-delete-button"
                type="button"
                hidden
              >
                Delete service
              </button>

              <div class="drawer-actions-right">
                <button id="serviceCancel" class="button button-secondary" type="button">
                  Cancel
                </button>
                <button id="saveService" class="button button-primary" type="submit">
                  Save service
                </button>
              </div>
            </div>
          </form>
        </aside>
      `
    );
  }

  bind() {
    this.elements.form.addEventListener("submit", (event) => this.submit(event));
    this.elements.close.addEventListener("click", () => this.close());
    this.elements.cancel.addEventListener("click", () => this.close());
    this.elements.delete.addEventListener("click", () => this.deleteService());
    this.elements.backdrop.addEventListener("click", () => this.close());

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        this.elements.drawer.classList.contains("is-open")
      ) {
        this.close();
      }
    });

    this.elements.addOnList.addEventListener(
      "change",
      () => this.updateAddOnSummary()
    );
  }

  async open(serviceId = "") {
    if (this.isSaving) return;

    this.mode = serviceId ? "edit" : "create";
    this.serviceId = serviceId || "";
    this.version = null;
    this.reset();
    this.show();
    this.setLoading(true);

    try {
      await Promise.all([
        this.loadClients(),
        this.loadOptions(),
      ]);

      if (this.mode === "edit") {
        await this.loadService();
      } else {
        this.elements.client.focus();
      }
    } catch (error) {
      this.showError(error.message || "The service editor could not be opened.");
      this.onError(error);
    } finally {
      this.setLoading(false);
    }
  }

  show() {
    this.elements.backdrop.hidden = false;
    this.elements.drawer.setAttribute("aria-hidden", "false");

    requestAnimationFrame(() => {
      this.elements.drawer.classList.add("is-open");
      document.body.classList.add("drawer-open");
    });
  }

  close() {
    if (this.isSaving) return;

    this.elements.drawer.classList.remove("is-open");
    this.elements.drawer.setAttribute("aria-hidden", "true");
    this.elements.backdrop.hidden = true;
    document.body.classList.remove("drawer-open");
    this.hideError();
  }

  reset() {
    this.elements.form.reset();
    this.elements.title.textContent =
      this.mode === "edit" ? "Edit service" : "Add service";
    this.elements.subtitle.textContent =
      this.mode === "edit"
        ? "Update the service while preserving its client history."
        : "Schedule a cleaning service for an active client.";
    this.elements.save.textContent =
      this.mode === "edit" ? "Save changes" : "Save service";
    this.elements.delete.hidden = this.mode !== "edit";
    this.elements.status.value = "scheduled";
    this.elements.client.replaceChildren(new Option("Select a client", ""));
    this.elements.type.replaceChildren(new Option("Select a service", ""));
    this.elements.addOnList.replaceChildren();
    this.elements.addOnSummary.textContent = "Select add-ons";
    this.elements.client.disabled = true;
    this.elements.type.disabled = true;
    this.elements.save.disabled = false;
    this.hideError();

    if (this.mode === "create") {
      const start = new Date();
      start.setMinutes(
        Math.ceil(start.getMinutes() / 15) * 15,
        0,
        0
      );
      this.elements.start.value = toLocalDateTimeValue(start);
    }
  }

  async loadClients() {
    const response = await this.clientApi.list({
      search: "",
      limit: CLIENT_PAGE_SIZE,
      offset: 0,
    });

    this.clients = Array.isArray(response?.data?.clients)
      ? response.data.clients
      : [];

    this.elements.client.replaceChildren(
      new Option("Select a client", ""),
      ...this.clients.map((client) => {
        const name = [client.first_name, client.last_name]
          .filter(Boolean)
          .join(" ");
        const detail = client.email || client.phone || client.city || "";
        return new Option(
          detail ? `${name} (${detail})` : name,
          client.id
        );
      })
    );

    this.elements.client.disabled = false;

    if (!this.clients.length) {
      throw new Error("Add an active client before creating a service.");
    }
  }

  async loadOptions() {
    const response = await fetch(SERVICE_CONFIG_URL, {
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(`Service options failed (${response.status}).`);
    }

    const config = await response.json();

    this.options = {
      serviceTypes: Array.isArray(config.serviceTypes)
        ? config.serviceTypes.filter((item) => item.active !== false)
        : [],
      addOns: Array.isArray(config.addOns)
        ? config.addOns.filter((item) => item.active !== false)
        : [],
    };

    this.elements.type.replaceChildren(
      new Option("Select a service", ""),
      ...this.options.serviceTypes.map(
        (service) => new Option(service.name, service.id)
      )
    );
    this.elements.type.disabled = false;

    this.elements.addOnList.replaceChildren(
      ...this.options.addOns.map((addon) => {
        const label = document.createElement("label");
        label.className = "addon-option";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = addon.id;

        const text = document.createElement("span");
        text.innerHTML = `<strong>${escapeHtml(addon.name)}</strong>`;

        label.append(input, text);
        return label;
      })
    );
  }

  async loadService() {
    const response = await this.api.detail(this.serviceId);
    const service = response?.data?.service ?? response?.data;

    if (!service?.id) {
      throw new Error("The service details response was incomplete.");
    }

    this.version = Number(service.version);
    this.elements.client.value = service.client_id || "";
    this.selectServiceType(service.service_type || "");
    this.elements.status.value = service.status || "scheduled";
    this.elements.start.value = toLocalDateTimeValue(
      new Date(service.scheduled_start)
    );
    this.elements.price.value =
      service.price_cents === null ||
      service.price_cents === undefined
        ? ""
        : (Number(service.price_cents) / 100).toFixed(2);

    const parsed = parseNotes(service.notes || "");
    this.elements.notes.value = parsed.notes;

    const selectedNames = new Set(
      parsed.addOns.map((name) => name.toLowerCase())
    );

    this.elements.addOnList
      .querySelectorAll('input[type="checkbox"]')
      .forEach((input) => {
        const addon = this.options.addOns.find(
          (item) => item.id === input.value
        );
        input.checked = Boolean(
          addon && selectedNames.has(addon.name.toLowerCase())
        );
      });

    this.updateAddOnSummary();
    this.elements.type.focus();
  }

  selectServiceType(serviceType) {
    const match = this.options.serviceTypes.find(
      (item) =>
        item.name.toLowerCase() ===
        String(serviceType).toLowerCase()
    );

    if (match) {
      this.elements.type.value = match.id;
      return;
    }

    if (serviceType) {
      const customId = `legacy:${serviceType}`;
      this.elements.type.append(
        new Option(`${serviceType} (existing)`, customId)
      );
      this.elements.type.value = customId;
    }
  }

  selectedServiceName() {
    const selected = this.options.serviceTypes.find(
      (service) => service.id === this.elements.type.value
    );

    if (selected) return selected.name;

    const option = this.elements.type.options[
      this.elements.type.selectedIndex
    ];

    return option?.text?.replace(" (existing)", "") || "";
  }

  selectedAddOns() {
    const selectedIds = new Set(
      Array.from(
        this.elements.addOnList.querySelectorAll(
          'input[type="checkbox"]:checked'
        )
      ).map((input) => input.value)
    );

    return this.options.addOns.filter(
      (addon) => selectedIds.has(addon.id)
    );
  }

  updateAddOnSummary() {
    const addOns = this.selectedAddOns();
    this.elements.addOnSummary.textContent =
      addOns.length
        ? `${addOns.length} add-on${addOns.length === 1 ? "" : "s"} selected`
        : "Select add-ons";
  }

  validate() {
    const start = new Date(this.elements.start.value);

    if (Number.isNaN(start.getTime())) {
      throw new Error("Scheduled start must be a valid date and time.");
    }

    const price = this.elements.price.value.trim();

    if (
      price &&
      (!Number.isFinite(Number(price)) || Number(price) < 0)
    ) {
      throw new Error("Price must be zero or a positive amount.");
    }

    if (
      this.mode === "edit" &&
      (!Number.isInteger(this.version) || this.version < 1)
    ) {
      throw new Error(
        "This service is missing its concurrency version. Refresh and try again."
      );
    }
  }

  buildPayload() {
    const price = this.elements.price.value.trim();
    const addOns = this.selectedAddOns();
    const noteSections = [];

    if (addOns.length) {
      noteSections.push(
        `[Add-ons]\n${addOns
          .map((addon) => `- ${addon.name}`)
          .join("\n")}`
      );
    }

    const manualNotes = this.elements.notes.value.trim();
    if (manualNotes) noteSections.push(manualNotes);

    const payload = {
      clientId: this.elements.client.value,
      serviceType: this.selectedServiceName(),
      status: this.elements.status.value,
      scheduledStart: new Date(this.elements.start.value).toISOString(),
      scheduledEnd: null,
      priceCents: price ? Math.round(Number(price) * 100) : null,
      notes: noteSections.length ? noteSections.join("\n\n") : null,
    };

    if (this.mode === "edit") {
      payload.version = this.version;
    }

    return payload;
  }

  async deleteService() {
    if (
      this.isSaving ||
      this.mode !== "edit" ||
      !this.serviceId
    ) {
      return;
    }

    if (
      !Number.isInteger(this.version) ||
      this.version < 1
    ) {
      this.showError(
        "This service is missing its concurrency version. Refresh and try again."
      );
      return;
    }

    const serviceName =
      this.selectedServiceName() || "this service";

    const confirmed = window.confirm(
      `Delete ${serviceName}?\n\n` +
      "This removes it from the active dashboard but preserves its history."
    );

    if (!confirmed) {
      return;
    }

    this.hideError();
    this.setSaving(true);
    this.elements.delete.textContent = "Deleting...";

    try {
      const response = await this.api.delete(
        this.serviceId,
        this.version
      );

      const service =
        response?.data?.service ??
        response?.data;

      if (!service?.id) {
        throw new Error(
          "The service was deleted, but the API response was incomplete."
        );
      }

      this.setSaving(false);
      this.elements.delete.textContent = "Delete service";
      this.close();
      await this.onDeleted(service);
    } catch (error) {
      this.setSaving(false);
      this.elements.delete.textContent = "Delete service";
      this.showError(
        error.message ||
          "The service could not be deleted."
      );
      this.onError(error);
    }
  }

  async submit(event) {
    event.preventDefault();
    if (this.isSaving) return;

    this.hideError();

    if (!this.elements.form.reportValidity()) return;

    try {
      this.validate();
    } catch (error) {
      this.showError(error.message);
      return;
    }

    this.setSaving(true);

    try {
      const response =
        this.mode === "edit"
          ? await this.api.update(
              this.serviceId,
              this.buildPayload()
            )
          : await this.api.create(this.buildPayload());

      const service = response?.data?.service ?? response?.data;

      if (!service?.id) {
        throw new Error(
          "The service was saved, but the API response was incomplete."
        );
      }

      const mode = this.mode;
      this.setSaving(false);
      this.close();
      await this.onSaved(service, mode);
    } catch (error) {
      this.setSaving(false);
      this.showError(
        error.message || "The service could not be saved."
      );
      this.onError(error);
    }
  }

  setLoading(isLoading) {
    this.elements.loading.hidden = !isLoading;
    this.elements.form.classList.toggle(
      "service-form-is-loading",
      isLoading
    );
  }

  setSaving(isSaving) {
    this.isSaving = isSaving;
    this.elements.save.disabled = isSaving;
    this.elements.delete.disabled = isSaving;
    this.elements.cancel.disabled = isSaving;
    this.elements.close.disabled = isSaving;
    this.elements.client.disabled = isSaving;
    this.elements.type.disabled = isSaving;
    this.elements.save.textContent = isSaving
      ? "Saving..."
      : this.mode === "edit"
        ? "Save changes"
        : "Save service";
  }

  showError(message) {
    this.elements.error.textContent = message;
    this.elements.error.hidden = false;
    this.elements.error.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  hideError() {
    this.elements.error.hidden = true;
    this.elements.error.textContent = "";
  }
}

function parseNotes(value) {
  const text = String(value || "").trim();

  if (!text.startsWith("[Add-ons]")) {
    return { addOns: [], notes: text };
  }

  const parts = text.split(/\n\s*\n/);
  const addOnBlock = parts.shift() || "";

  const addOns = addOnBlock
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);

  return {
    addOns,
    notes: parts.join("\n\n").trim(),
  };
}

function toLocalDateTimeValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
