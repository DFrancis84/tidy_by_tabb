export class ClientDrawer {
  constructor({
    api,
    onCreated = () => {},
    onError = () => {},
  }) {
    this.api = api;
    this.onCreated = onCreated;
    this.onError = onError;
    this.isSaving = false;

    this.injectMarkup();

    this.elements = {
      backdrop: document.getElementById(
        "clientDrawerBackdrop"
      ),
      drawer: document.getElementById(
        "clientDrawer"
      ),
      form: document.getElementById(
        "clientForm"
      ),
      close: document.getElementById(
        "clientDrawerClose"
      ),
      cancel: document.getElementById(
        "clientDrawerCancel"
      ),
      save: document.getElementById(
        "saveClient"
      ),
      error: document.getElementById(
        "clientFormError"
      ),
      firstName: document.getElementById(
        "clientFirstName"
      ),
      lastName: document.getElementById(
        "clientLastName"
      ),
      email: document.getElementById(
        "clientEmail"
      ),
      phone: document.getElementById(
        "clientPhone"
      ),
      addressLine1: document.getElementById(
        "clientAddressLine1"
      ),
      addressLine2: document.getElementById(
        "clientAddressLine2"
      ),
      city: document.getElementById(
        "clientCity"
      ),
      state: document.getElementById(
        "clientState"
      ),
      postalCode: document.getElementById(
        "clientPostalCode"
      ),
      notes: document.getElementById(
        "clientNotes"
      ),
    };
  }

  injectMarkup() {
    if (document.getElementById("clientDrawer")) {
      return;
    }

    const wrapper = document.createElement("div");

    wrapper.innerHTML = `
      <div
        id="clientDrawerBackdrop"
        class="drawer-backdrop"
        hidden
      ></div>

      <aside
        id="clientDrawer"
        class="drawer client-drawer"
        aria-hidden="true"
        aria-labelledby="clientDrawerTitle"
      >
        <form id="clientForm" novalidate>
          <div class="drawer-header">
            <div>
              <p class="eyebrow">Customer directory</p>
              <h2 id="clientDrawerTitle">Add client</h2>
              <small class="drawer-subtitle">
                Create the customer record used by
                services and review requests.
              </small>
            </div>

            <button
              id="clientDrawerClose"
              class="icon-button"
              type="button"
              aria-label="Close client form"
            >
              ×
            </button>
          </div>

          <div class="drawer-body">
            <div
              id="clientFormError"
              class="form-error"
              role="alert"
              hidden
            ></div>

            <section class="client-form-section">
              <div class="client-form-heading">
                <p class="eyebrow">Required</p>
                <h3>Client name</h3>
              </div>

              <div class="form-grid">
                <label class="field">
                  <span>First name</span>
                  <input
                    id="clientFirstName"
                    name="firstName"
                    required
                    maxlength="100"
                    autocomplete="given-name"
                  >
                </label>

                <label class="field">
                  <span>Last name</span>
                  <input
                    id="clientLastName"
                    name="lastName"
                    required
                    maxlength="100"
                    autocomplete="family-name"
                  >
                </label>
              </div>
            </section>

            <section class="client-form-section">
              <div class="client-form-heading">
                <p class="eyebrow">Contact</p>
                <h3>Email and phone</h3>
              </div>

              <div class="form-grid">
                <label class="field">
                  <span>Email</span>
                  <input
                    id="clientEmail"
                    name="email"
                    type="email"
                    maxlength="254"
                    autocomplete="email"
                    placeholder="name@example.com"
                  >
                </label>

                <label class="field">
                  <span>Phone</span>
                  <input
                    id="clientPhone"
                    name="phone"
                    type="tel"
                    maxlength="30"
                    autocomplete="tel"
                    placeholder="555-555-5555"
                  >
                </label>
              </div>
            </section>

            <section class="client-form-section">
              <div class="client-form-heading">
                <p class="eyebrow">Location</p>
                <h3>Service address</h3>
              </div>

              <div class="form-grid">
                <label class="field field-full">
                  <span>Address line 1</span>
                  <input
                    id="clientAddressLine1"
                    name="addressLine1"
                    maxlength="200"
                    autocomplete="address-line1"
                  >
                </label>

                <label class="field field-full">
                  <span>Address line 2</span>
                  <input
                    id="clientAddressLine2"
                    name="addressLine2"
                    maxlength="200"
                    autocomplete="address-line2"
                  >
                </label>

                <label class="field">
                  <span>City</span>
                  <input
                    id="clientCity"
                    name="city"
                    maxlength="100"
                    autocomplete="address-level2"
                  >
                </label>

                <label class="field">
                  <span>State</span>
                  <input
                    id="clientState"
                    name="state"
                    maxlength="50"
                    autocomplete="address-level1"
                  >
                </label>

                <label class="field">
                  <span>Postal code</span>
                  <input
                    id="clientPostalCode"
                    name="postalCode"
                    maxlength="20"
                    autocomplete="postal-code"
                  >
                </label>
              </div>
            </section>

            <section class="client-form-section">
              <div class="client-form-heading">
                <p class="eyebrow">Internal</p>
                <h3>Notes</h3>
              </div>

              <label class="field">
                <span class="sr-only">Client notes</span>
                <textarea
                  id="clientNotes"
                  name="notes"
                  maxlength="5000"
                  rows="5"
                  placeholder="Access instructions, preferences, or other internal notes"
                ></textarea>
              </label>
            </section>
          </div>

          <div class="drawer-actions">
            <div class="drawer-actions-right">
              <button
                id="clientDrawerCancel"
                class="button button-secondary"
                type="button"
              >
                Cancel
              </button>

              <button
                id="saveClient"
                class="button button-primary"
                type="submit"
              >
                Save client
              </button>
            </div>
          </div>
        </form>
      </aside>
    `;

    document.body.append(...wrapper.children);
  }

  bind() {
    this.elements.form.addEventListener(
      "submit",
      (event) => this.submit(event)
    );

    this.elements.close.addEventListener(
      "click",
      () => this.close()
    );

    this.elements.cancel.addEventListener(
      "click",
      () => this.close()
    );

    this.elements.backdrop.addEventListener(
      "click",
      () => this.close()
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          this.elements.drawer.classList.contains(
            "is-open"
          )
        ) {
          this.close();
        }
      }
    );
  }

  open() {
    this.elements.form.reset();
    this.hideError();

    this.elements.backdrop.hidden = false;
    this.elements.drawer.classList.add("is-open");
    this.elements.drawer.setAttribute(
      "aria-hidden",
      "false"
    );
    document.body.classList.add("drawer-open");

    requestAnimationFrame(() => {
      this.elements.firstName.focus();
    });
  }

  close() {
    if (this.isSaving) {
      return;
    }

    this.elements.drawer.classList.remove("is-open");
    this.elements.drawer.setAttribute(
      "aria-hidden",
      "true"
    );
    this.elements.backdrop.hidden = true;
    document.body.classList.remove("drawer-open");
    this.hideError();
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

    const payload = this.buildPayload();

    this.setSaving(true);

    try {
      const response = await this.api.create(payload);
      const client = response?.data?.client;

      if (!client) {
        throw new Error(
          "The client was created but no client record was returned."
        );
      }

      this.setSaving(false);
      this.close();
      await this.onCreated(client);
    } catch (error) {
      this.setSaving(false);
      this.showError(
        error.message ||
          "The client could not be created."
      );
      this.onError(error);
    }
  }

  buildPayload() {
    const payload = {
      firstName: this.elements.firstName.value.trim(),
      lastName: this.elements.lastName.value.trim(),
    };

    const optionalFields = {
      email: this.elements.email.value,
      phone: this.elements.phone.value,
      addressLine1:
        this.elements.addressLine1.value,
      addressLine2:
        this.elements.addressLine2.value,
      city: this.elements.city.value,
      state: this.elements.state.value,
      postalCode:
        this.elements.postalCode.value,
      notes: this.elements.notes.value,
    };

    Object.entries(optionalFields).forEach(
      ([key, value]) => {
        const trimmed = value.trim();

        if (trimmed) {
          payload[key] = trimmed;
        }
      }
    );

    return payload;
  }

  setSaving(isSaving) {
    this.isSaving = isSaving;
    this.elements.save.disabled = isSaving;
    this.elements.cancel.disabled = isSaving;
    this.elements.close.disabled = isSaving;
    this.elements.save.textContent = isSaving
      ? "Saving…"
      : "Save client";
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
