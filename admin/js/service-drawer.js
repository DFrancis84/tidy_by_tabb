const CLIENT_PAGE_SIZE = 100;
const SERVICE_CONFIG_URL =
  "./config/service-options.json?v=20260804-4";

export class ServiceDrawer {
  constructor({
    api,
    clientApi,
    onSaved = () => {},
    onError = () => {},
  }) {
    this.api = api;
    this.clientApi = clientApi;
    this.onSaved = onSaved;
    this.onError = onError;
    this.isSaving = false;
    this.clients = [];
    this.options = {
      currency: "USD",
      serviceTypes: [],
      addOns: [],
    };

    this.injectMarkup();

    this.elements = {
      backdrop: document.getElementById("serviceDrawerBackdrop"),
      drawer: document.getElementById("serviceDrawer"),
      form: document.getElementById("serviceForm"),
      close: document.getElementById("serviceDrawerClose"),
      cancel: document.getElementById("serviceCancel"),
      save: document.getElementById("saveService"),
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
    if (document.getElementById("serviceDrawer")) {
      return;
    }

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
                <small class="drawer-subtitle">
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
              <div
                id="serviceFormError"
                class="form-error"
                role="alert"
                hidden
              ></div>

              <div
                id="serviceClientLoading"
                class="loading-state service-client-loading"
                hidden
              >
                Loading clients...
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
                    <summary id="serviceAddOnSummary">
                      Select add-ons
                    </summary>
                    <div
                      id="serviceAddOnList"
                      class="addon-options"
                    ></div>
                  </details>
                  <small>
                    Choose any extras requested for this visit.
                  </small>
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
                  <small>
                    Enter the quoted price for this specific job.
                  </small>
                </label>

                <label class="field service-field-wide">
                  <span>Scheduled start</span>
                  <input
                    id="serviceScheduledStart"
                    type="datetime-local"
                    required
                  >
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

            <div class="drawer-actions">
              <div class="drawer-actions-right">
                <button
                  id="serviceCancel"
                  class="button button-secondary"
                  type="button"
                >
                  Cancel
                </button>

                <button
                  id="saveService"
                  class="button button-primary"
                  type="submit"
                >
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
    this.elements.form.addEventListener(
      "submit",
      (event) => this.submit(event)
    );

    this.elements.close.addEventListener("click", () => this.close());
    this.elements.cancel.addEventListener("click", () => this.close());
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

  async open() {
    if (this.isSaving) {
      return;
    }

    this.reset();
    this.show();

    await Promise.all([
      this.loadClients(),
      this.loadOptions(),
    ]);
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
    if (this.isSaving) {
      return;
    }

    this.elements.drawer.classList.remove("is-open");
    this.elements.drawer.setAttribute("aria-hidden", "true");
    this.elements.backdrop.hidden = true;
    document.body.classList.remove("drawer-open");
    this.hideError();
  }

  reset() {
    this.elements.form.reset();
    this.elements.status.value = "scheduled";
    this.elements.client.replaceChildren(
      new Option("Select a client", "")
    );
    this.elements.type.replaceChildren(
      new Option("Select a service", "")
    );
    this.elements.addOnList.replaceChildren();
    this.elements.addOnSummary.textContent = "Select add-ons";
    this.elements.client.disabled = true;
    this.elements.type.disabled = true;
    this.elements.save.disabled = false;
    this.elements.save.textContent = "Save service";
    this.elements.price.value = "";
    this.hideError();

    const start = new Date();
    start.setMinutes(
      Math.ceil(start.getMinutes() / 15) * 15,
      0,
      0
    );
    this.elements.start.value =
      toLocalDateTimeValue(start);
  }

  async loadClients() {
    this.elements.loading.hidden = false;

    try {
      const response = await this.clientApi.list({
        search: "",
        limit: CLIENT_PAGE_SIZE,
        offset: 0,
      });

      this.clients = Array.isArray(response?.data?.clients)
        ? response.data.clients
        : [];

      const options = [
        new Option("Select a client", ""),
        ...this.clients.map((client) => {
          const name = [
            client.first_name,
            client.last_name,
          ].filter(Boolean).join(" ");

          const detail =
            client.email ||
            client.phone ||
            client.city ||
            "";

          return new Option(
            detail ? `${name} (${detail})` : name,
            client.id
          );
        }),
      ];

      this.elements.client.replaceChildren(...options);
      this.elements.client.disabled = false;

      if (!this.clients.length) {
        this.showError(
          "Add an active client before creating a service."
        );
        this.elements.save.disabled = true;
        return;
      }

      this.elements.client.focus();
    } catch (error) {
      this.showError(
        error.message ||
          "Active clients could not be loaded."
      );
      this.elements.save.disabled = true;
      this.onError(error);
    } finally {
      this.elements.loading.hidden = true;
    }
  }

  async loadOptions() {
    try {
      const response = await fetch(SERVICE_CONFIG_URL, {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          `Service options failed (${response.status}).`
        );
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

      const serviceOptions = [
        new Option("Select a service", ""),
        ...this.options.serviceTypes.map(
          (service) =>
            new Option(service.name, service.id)
        ),
      ];

      this.elements.type.replaceChildren(...serviceOptions);
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
    } catch (error) {
      this.showError(
        "Service options could not be loaded. " +
        "Manual service entry is still available."
      );
      this.elements.type.disabled = false;
      this.onError(error);
    }
  }

  selectedService() {
    return this.options.serviceTypes.find(
      (service) =>
        service.id === this.elements.type.value
    ) || null;
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
      throw new Error(
        "Scheduled start must be a valid date and time."
      );
    }

    const price = this.elements.price.value.trim();

    if (
      price &&
      (
        !Number.isFinite(Number(price)) ||
        Number(price) < 0
      )
    ) {
      throw new Error(
        "Price must be zero or a positive amount."
      );
    }
  }

  buildPayload() {
    const price = this.elements.price.value.trim();
    const service = this.selectedService();
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

    if (manualNotes) {
      noteSections.push(manualNotes);
    }

    return {
      clientId: this.elements.client.value,
      serviceType:
        service?.name ||
        this.elements.type.options[
          this.elements.type.selectedIndex
        ]?.text ||
        this.elements.type.value,
      status: this.elements.status.value,
      scheduledStart: new Date(
        this.elements.start.value
      ).toISOString(),
      scheduledEnd: null,
      priceCents: price
        ? Math.round(Number(price) * 100)
        : null,
      notes: noteSections.length
        ? noteSections.join("\n\n")
        : null,
    };
  }

  async submit(event) {
    event.preventDefault();

    if (this.isSaving) {
      return;
    }

    this.hideError();

    if (!this.elements.form.reportValidity()) {
      return;
    }

    try {
      this.validate();
    } catch (error) {
      this.showError(error.message);
      return;
    }

    this.setSaving(true);

    try {
      const response = await this.api.create(
        this.buildPayload()
      );

      const service =
        response?.data?.service ??
        response?.data;

      if (!service?.id) {
        throw new Error(
          "The service was saved, but the API response was incomplete."
        );
      }

      this.setSaving(false);
      this.close();
      await this.onSaved(service);
    } catch (error) {
      this.setSaving(false);
      this.showError(
        error.message ||
          "The service could not be saved."
      );
      this.onError(error);
    }
  }

  setSaving(isSaving) {
    this.isSaving = isSaving;
    this.elements.save.disabled = isSaving;
    this.elements.cancel.disabled = isSaving;
    this.elements.close.disabled = isSaving;
    this.elements.client.disabled = isSaving;
    this.elements.type.disabled = isSaving;
    this.elements.save.textContent = isSaving
      ? "Saving..."
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

function toLocalDateTimeValue(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(
    date.getTime() - offset * 60_000
  );

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
