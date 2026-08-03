export class ClientDrawer {
  constructor({
    api,
    onSaved = () => {},
    onDeleted = () => {},
    onError = () => {},
  }) {
    this.api = api;
    this.onSaved = onSaved;
    this.onDeleted = onDeleted;
    this.onError = onError;
    this.isSaving = false;
    this.mode = "create";
    this.clientId = "";
    this.version = null;

    this.injectMarkup();

    this.elements = {
      backdrop: document.getElementById("clientDrawerBackdrop"),
      drawer: document.getElementById("clientDrawer"),
      form: document.getElementById("clientForm"),
      title: document.getElementById("clientDrawerTitle"),
      subtitle: document.getElementById("clientDrawerSubtitle"),
      close: document.getElementById("clientDrawerClose"),
      cancel: document.getElementById("clientDrawerCancel"),
      save: document.getElementById("saveClient"),
      deleteButton: document.getElementById("deleteClient"),
      deleteModal: document.getElementById("clientDeleteModal"),
      deleteMessage: document.getElementById("clientDeleteMessage"),
      deleteCancel: document.getElementById("clientDeleteCancel"),
      deleteConfirm: document.getElementById("clientDeleteConfirm"),
      error: document.getElementById("clientFormError"),
      loading: document.getElementById("clientFormLoading"),
      content: document.getElementById("clientFormContent"),
      firstName: document.getElementById("clientFirstName"),
      lastName: document.getElementById("clientLastName"),
      email: document.getElementById("clientEmail"),
      phone: document.getElementById("clientPhone"),
      addressLine1: document.getElementById("clientAddressLine1"),
      addressLine2: document.getElementById("clientAddressLine2"),
      city: document.getElementById("clientCity"),
      state: document.getElementById("clientState"),
      postalCode: document.getElementById("clientPostalCode"),
      notes: document.getElementById("clientNotes"),
    };
  }

  injectMarkup() {
    if (document.getElementById("clientDrawer")) {
      return;
    }

    const wrapper = document.createElement("div");

    wrapper.innerHTML = `
      <div id="clientDrawerBackdrop" class="drawer-backdrop" hidden></div>

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
              <small id="clientDrawerSubtitle" class="drawer-subtitle">
                Create the customer record used by services and review requests.
              </small>
            </div>

            <button
              id="clientDrawerClose"
              class="icon-button"
              type="button"
              aria-label="Close client form"
            >×</button>
          </div>

          <div class="drawer-body">
            <div id="clientFormError" class="form-error" role="alert" hidden></div>
            <div id="clientFormLoading" class="loading-state" hidden>
              Loading client…
            </div>

            <div id="clientFormContent">
              <section class="client-form-section">
                <div class="client-form-heading">
                  <p class="eyebrow">Required</p>
                  <h3>Client name</h3>
                </div>

                <div class="form-grid">
                  <label class="field">
                    <span>First name</span>
                    <input id="clientFirstName" required maxlength="100" autocomplete="given-name">
                  </label>

                  <label class="field">
                    <span>Last name</span>
                    <input id="clientLastName" required maxlength="100" autocomplete="family-name">
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
                    <input id="clientEmail" type="email" maxlength="254" autocomplete="email" placeholder="name@example.com">
                  </label>

                  <label class="field">
                    <span>Phone</span>
                    <input id="clientPhone" type="tel" maxlength="30" autocomplete="tel" placeholder="555-555-5555">
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
                    <input id="clientAddressLine1" maxlength="200" autocomplete="address-line1">
                  </label>

                  <label class="field field-full">
                    <span>Address line 2</span>
                    <input id="clientAddressLine2" maxlength="200" autocomplete="address-line2">
                  </label>

                  <label class="field">
                    <span>City</span>
                    <input id="clientCity" maxlength="100" autocomplete="address-level2">
                  </label>

                  <label class="field">
                    <span>State</span>
                    <select id="clientState" autocomplete="address-level1">
                      <option value="">Select a state</option>
                    <option value="AL">AL · Alabama</option>
                    <option value="AK">AK · Alaska</option>
                    <option value="AZ">AZ · Arizona</option>
                    <option value="AR">AR · Arkansas</option>
                    <option value="CA">CA · California</option>
                    <option value="CO">CO · Colorado</option>
                    <option value="CT">CT · Connecticut</option>
                    <option value="DE">DE · Delaware</option>
                    <option value="FL">FL · Florida</option>
                    <option value="GA">GA · Georgia</option>
                    <option value="HI">HI · Hawaii</option>
                    <option value="ID">ID · Idaho</option>
                    <option value="IL">IL · Illinois</option>
                    <option value="IN">IN · Indiana</option>
                    <option value="IA">IA · Iowa</option>
                    <option value="KS">KS · Kansas</option>
                    <option value="KY">KY · Kentucky</option>
                    <option value="LA">LA · Louisiana</option>
                    <option value="ME">ME · Maine</option>
                    <option value="MD">MD · Maryland</option>
                    <option value="MA">MA · Massachusetts</option>
                    <option value="MI">MI · Michigan</option>
                    <option value="MN">MN · Minnesota</option>
                    <option value="MS">MS · Mississippi</option>
                    <option value="MO">MO · Missouri</option>
                    <option value="MT">MT · Montana</option>
                    <option value="NE">NE · Nebraska</option>
                    <option value="NV">NV · Nevada</option>
                    <option value="NH">NH · New Hampshire</option>
                    <option value="NJ">NJ · New Jersey</option>
                    <option value="NM">NM · New Mexico</option>
                    <option value="NY">NY · New York</option>
                    <option value="NC">NC · North Carolina</option>
                    <option value="ND">ND · North Dakota</option>
                    <option value="OH">OH · Ohio</option>
                    <option value="OK">OK · Oklahoma</option>
                    <option value="OR">OR · Oregon</option>
                    <option value="PA">PA · Pennsylvania</option>
                    <option value="RI">RI · Rhode Island</option>
                    <option value="SC">SC · South Carolina</option>
                    <option value="SD">SD · South Dakota</option>
                    <option value="TN">TN · Tennessee</option>
                    <option value="TX">TX · Texas</option>
                    <option value="UT">UT · Utah</option>
                    <option value="VT">VT · Vermont</option>
                    <option value="VA">VA · Virginia</option>
                    <option value="WA">WA · Washington</option>
                    <option value="WV">WV · West Virginia</option>
                    <option value="WI">WI · Wisconsin</option>
                    <option value="WY">WY · Wyoming</option>
                    <option value="DC">DC · District of Columbia</option>
                    </select>
                  </label>

                  <label class="field">
                    <span>Postal code</span>
                    <input id="clientPostalCode" maxlength="20" autocomplete="postal-code">
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
                    maxlength="5000"
                    rows="5"
                    placeholder="Access instructions, preferences, or other internal notes"
                  ></textarea>
                </label>
              </section>
            </div>
          </div>

          <div class="drawer-actions">
            <button
              id="deleteClient"
              class="button button-danger"
              type="button"
              hidden
            >
              Delete client
            </button>

            <div class="drawer-actions-right">
              <button id="clientDrawerCancel" class="button button-secondary" type="button">
                Cancel
              </button>
              <button id="saveClient" class="button button-primary" type="submit">
                Save client
              </button>
            </div>
          </div>
        </form>
      </aside>

      <div id="clientDeleteModal" class="modal-shell" hidden>
        <div class="modal-backdrop"></div>
        <section
          class="modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clientDeleteTitle"
        >
          <div class="modal-header">
            <div>
              <p class="eyebrow">Permanent action</p>
              <h2 id="clientDeleteTitle">Delete client?</h2>
            </div>
          </div>

          <p id="clientDeleteMessage">
            This client will be removed from the active directory.
          </p>

          <div class="delete-warning">
            This is a soft delete. The record remains in the database
            for audit history but disappears from normal CMS views.
          </div>

          <div class="modal-actions">
            <button
              id="clientDeleteCancel"
              class="button button-secondary"
              type="button"
            >
              Keep client
            </button>

            <button
              id="clientDeleteConfirm"
              class="button button-danger"
              type="button"
            >
              Delete client
            </button>
          </div>
        </section>
      </div>

    `;

    document.body.append(...wrapper.children);
  }

  bind() {
    this.elements.form.addEventListener("submit", (event) => this.submit(event));
    this.elements.close.addEventListener("click", () => this.close());
    this.elements.cancel.addEventListener("click", () => this.close());
    this.elements.backdrop.addEventListener("click", () => this.close());
    this.elements.deleteButton.addEventListener(
      "click",
      () => this.openDeleteModal()
    );
    this.elements.deleteCancel.addEventListener(
      "click",
      () => this.closeDeleteModal()
    );
    this.elements.deleteModal
      .querySelector(".modal-backdrop")
      ?.addEventListener(
        "click",
        () => this.closeDeleteModal()
      );
    this.elements.deleteConfirm.addEventListener(
      "click",
      () => this.confirmDelete()
    );

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (!this.elements.deleteModal.hidden) {
        this.closeDeleteModal();
        return;
      }

      if (
        this.elements.drawer.classList.contains("is-open")
      ) {
        this.close();
      }
    });
  }

  async open(clientId = "") {
    this.elements.form.reset();
    this.hideError();

    this.clientId = String(clientId || "").trim();
    this.mode = this.clientId ? "edit" : "create";
    this.version = null;

    this.elements.title.textContent =
      this.mode === "edit" ? "Edit client" : "Add client";
    this.elements.subtitle.textContent =
      this.mode === "edit"
        ? "Update customer details using version-safe editing."
        : "Create the customer record used by services and review requests.";
    this.elements.save.textContent =
      this.mode === "edit" ? "Save changes" : "Save client";
    this.elements.deleteButton.hidden =
      this.mode !== "edit";

    this.elements.backdrop.hidden = false;
    this.elements.drawer.classList.add("is-open");
    this.elements.drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");

    if (this.mode === "create") {
      this.setLoading(false);
      requestAnimationFrame(() => this.elements.firstName.focus());
      return;
    }

    this.setLoading(true);

    try {
      const response = await this.api.detail(this.clientId);
      const client = response?.data?.client;

      if (!client) {
        throw new Error("The client record could not be loaded.");
      }

      this.populate(client);
      this.version = client.version;
      this.setLoading(false);
      requestAnimationFrame(() => this.elements.firstName.focus());
    } catch (error) {
      this.setLoading(false);
      this.showError(error.message || "The client could not be loaded.");
      this.onError(error);
    }
  }

  close() {
    if (this.isSaving) {
      return;
    }

    this.elements.drawer.classList.remove("is-open");
    this.elements.drawer.setAttribute("aria-hidden", "true");
    this.elements.backdrop.hidden = true;
    document.body.classList.remove("drawer-open");
    this.closeDeleteModal();
    this.hideError();
  }

  populate(client) {
    this.elements.firstName.value = client.first_name || "";
    this.elements.lastName.value = client.last_name || "";
    this.elements.email.value = client.email || "";
    this.elements.phone.value = client.phone || "";
    this.elements.addressLine1.value = client.address_line1 || "";
    this.elements.addressLine2.value = client.address_line2 || "";
    this.elements.city.value = client.city || "";
    this.elements.state.value = client.state || "";
    this.elements.postalCode.value = client.postal_code || "";
    this.elements.notes.value = client.notes || "";
  }

  async submit(event) {
    event.preventDefault();

    if (this.isSaving || !this.elements.form.reportValidity()) {
      return;
    }

    this.hideError();
    const payload = this.buildPayload();

    if (this.mode === "edit") {
      if (!Number.isInteger(Number(this.version)) || Number(this.version) < 1) {
        this.showError("The client version is missing. Close and reopen the record.");
        return;
      }
      payload.version = Number(this.version);
    }

    this.setSaving(true);

    try {
      const response = this.mode === "edit"
        ? await this.api.update(this.clientId, payload)
        : await this.api.create(payload);

      const client = response?.data?.client;

      if (!client) {
        throw new Error("The client was saved but no client record was returned.");
      }

      const savedMode = this.mode;
      this.setSaving(false);
      this.close();
      await this.onSaved(client, savedMode);
    } catch (error) {
      this.setSaving(false);
      this.showError(error.message || "The client could not be saved.");
      this.onError(error);
    }
  }

  buildPayload() {
    return {
      firstName: this.elements.firstName.value.trim(),
      lastName: this.elements.lastName.value.trim(),
      email: nullableValue(this.elements.email.value),
      phone: nullableValue(this.elements.phone.value),
      addressLine1: nullableValue(this.elements.addressLine1.value),
      addressLine2: nullableValue(this.elements.addressLine2.value),
      city: nullableValue(this.elements.city.value),
      state: nullableValue(this.elements.state.value),
      postalCode: nullableValue(this.elements.postalCode.value),
      notes: nullableValue(this.elements.notes.value),
    };
  }

  openDeleteModal() {
    if (
      this.mode !== "edit" ||
      !this.clientId ||
      !Number.isInteger(Number(this.version))
    ) {
      this.showError(
        "The client must finish loading before it can be deleted."
      );
      return;
    }

    const clientName = [
      this.elements.firstName.value.trim(),
      this.elements.lastName.value.trim(),
    ].filter(Boolean).join(" ");

    this.elements.deleteMessage.textContent =
      `Delete ${clientName || "this client"}? ` +
      "They will disappear from the active client directory.";

    this.elements.deleteModal.hidden = false;
    requestAnimationFrame(() => {
      this.elements.deleteConfirm.focus();
    });
  }

  closeDeleteModal() {
    if (this.isSaving) {
      return;
    }

    this.elements.deleteModal.hidden = true;
    this.elements.deleteConfirm.disabled = false;
    this.elements.deleteConfirm.textContent = "Delete client";
  }

  async confirmDelete() {
    if (this.isSaving) {
      return;
    }

    const clientName = [
      this.elements.firstName.value.trim(),
      this.elements.lastName.value.trim(),
    ].filter(Boolean).join(" ");

    this.isSaving = true;
    this.elements.deleteConfirm.disabled = true;
    this.elements.deleteCancel.disabled = true;
    this.elements.deleteConfirm.textContent = "Deleting…";
    this.elements.save.disabled = true;
    this.elements.deleteButton.disabled = true;

    try {
      await this.api.delete(
        this.clientId,
        Number(this.version)
      );

      this.isSaving = false;
      this.elements.deleteCancel.disabled = false;
      this.elements.deleteButton.disabled = false;
      this.closeDeleteModal();
      this.close();
      await this.onDeleted(clientName);
    } catch (error) {
      this.isSaving = false;
      this.elements.deleteConfirm.disabled = false;
      this.elements.deleteCancel.disabled = false;
      this.elements.deleteButton.disabled = false;
      this.elements.save.disabled = false;
      this.elements.deleteConfirm.textContent = "Delete client";
      this.closeDeleteModal();
      this.showError(
        error.message || "The client could not be deleted."
      );
      this.onError(error);
    }
  }

  setLoading(isLoading) {
    this.elements.loading.hidden = !isLoading;
    this.elements.content.hidden = isLoading;
    this.elements.save.disabled = isLoading;
  }

  setSaving(isSaving) {
    this.isSaving = isSaving;
    this.elements.save.disabled = isSaving;
    this.elements.cancel.disabled = isSaving;
    this.elements.close.disabled = isSaving;
    this.elements.deleteButton.disabled = isSaving;
    this.elements.save.textContent = isSaving
      ? "Saving…"
      : this.mode === "edit"
        ? "Save changes"
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

function nullableValue(value) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}
