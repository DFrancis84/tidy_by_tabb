(() => {
  const PAGE_SIZE = 25;

  const state = {
    search: "",
    status: "",
    offset: 0,
    total: 0,
    selected: null,
  };

  const elements = {
    search: document.getElementById("requestSearch"),
    status: document.getElementById(
      "requestStatusFilter"
    ),
    refresh: document.getElementById(
      "requestRefresh"
    ),
    loading: document.getElementById(
      "requestLoading"
    ),
    error: document.getElementById(
      "requestError"
    ),
    errorMessage: document.getElementById(
      "requestErrorMessage"
    ),
    empty: document.getElementById(
      "requestEmpty"
    ),
    tableWrap: document.getElementById(
      "requestTableWrap"
    ),
    tableBody: document.getElementById(
      "requestTableBody"
    ),
    pagination: document.getElementById(
      "requestPagination"
    ),
    range: document.getElementById(
      "requestRange"
    ),
    previous: document.getElementById(
      "requestPrevious"
    ),
    next: document.getElementById(
      "requestNext"
    ),
    drawer: document.getElementById(
      "requestDrawer"
    ),
    drawerBody: document.getElementById(
      "drawerBody"
    ),
    drawerTitle: document.getElementById(
      "drawerTitle"
    ),
    drawerClose: document.getElementById(
      "drawerClose"
    ),
    backdrop: document.getElementById(
      "drawerBackdrop"
    ),
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const prettyStatus = (value) =>
    String(value || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );

  const formatDate = (value, withTime = false) => {
    if (!value) return "Not provided";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return escapeHtml(value);
    }

    return new Intl.DateTimeFormat(
      "en-US",
      withTime
        ? {
            dateStyle: "medium",
            timeStyle: "short",
          }
        : { dateStyle: "medium" }
    ).format(date);
  };

  const formatMoney = (cents) => {
    if (
      cents === null ||
      cents === undefined ||
      cents === ""
    ) {
      return "";
    }

    return (Number(cents) / 100).toFixed(2);
  };

  const formatSquareFootage = (item) => {
    if (item.square_footage_range) {
      return item.square_footage_range;
    }

    if (
      item.square_footage !== null &&
      item.square_footage !== undefined &&
      item.square_footage !== ""
    ) {
      return `${Number(item.square_footage).toLocaleString()} sq ft`;
    }

    return "Not provided";
  };

  const buildServiceNotes = (item) => {
    const lines = [];

    if (
      Array.isArray(item.requested_add_ons) &&
      item.requested_add_ons.length
    ) {
      lines.push(
        `Requested add-ons: ${item.requested_add_ons.join(", ")}`
      );
    }

    const propertyParts = [
      item.property_type,
      item.bedrooms !== null &&
      item.bedrooms !== undefined
        ? `${item.bedrooms} bedroom${Number(item.bedrooms) === 1 ? "" : "s"}`
        : "",
      item.bathrooms !== null &&
      item.bathrooms !== undefined
        ? `${item.bathrooms} bathroom${Number(item.bathrooms) === 1 ? "" : "s"}`
        : "",
      formatSquareFootage(item) !== "Not provided"
        ? formatSquareFootage(item)
        : "",
    ].filter(Boolean);

    if (propertyParts.length) {
      lines.push(`Property: ${propertyParts.join(" | ")}`);
    }

    if (item.property_condition) {
      lines.push(`Condition: ${item.property_condition}`);
    }

    if (item.pets) {
      lines.push(`Pets: ${item.pets}`);
    }

    if (item.entry_instructions) {
      lines.push(`Entry: ${item.entry_instructions}`);
    }

    if (item.customer_notes) {
      lines.push(`Customer notes: ${item.customer_notes}`);
    }

    return lines.join("\n");
  };

    const localDateTimeToIso = (
      dateValue,
      timeValue
    ) => {
    const dateMatch = String(dateValue || "").match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    const timeMatch = String(timeValue || "").match(
      /^(\d{2}):(\d{2})$/
    );

    if (!dateMatch || !timeMatch) {
      throw new Error(
        "Choose both a scheduled date and scheduled time."
      );
    }

    const date = new Date(
      Number(dateMatch[1]),
      Number(dateMatch[2]) - 1,
      Number(dateMatch[3]),
      Number(timeMatch[1]),
      Number(timeMatch[2]),
      0,
      0
    );

    if (Number.isNaN(date.getTime())) {
      throw new Error(
        "Scheduled date and time are invalid."
      );
    }

    return date.toISOString();
  };

  function setLoading() {
    elements.loading.hidden = false;
    elements.error.hidden = true;
    elements.empty.hidden = true;
    elements.tableWrap.hidden = true;
    elements.pagination.hidden = true;
  }

  async function loadRequests() {
    setLoading();

    try {
      const response = await RequestsApi.list({
        search: state.search,
        status: state.status,
        limit: PAGE_SIZE,
        offset: state.offset,
      });

      const requests =
        response.data?.requests || [];

      state.total = Number(
        response.metadata?.total || 0
      );

      if (
        requests.length === 0 &&
        state.offset > 0 &&
        state.total > 0
      ) {
        state.offset = Math.max(
          0,
          state.offset - PAGE_SIZE
        );
        return loadRequests();
      }

      renderRows(requests);
      renderPagination(requests.length);

      elements.loading.hidden = true;
      elements.empty.hidden = requests.length > 0;
      elements.tableWrap.hidden =
        requests.length === 0;
      elements.pagination.hidden =
        state.total === 0;
    } catch (error) {
      elements.loading.hidden = true;
      elements.error.hidden = false;
      elements.errorMessage.textContent =
        error.message;
    }
  }

  function renderRows(requests) {
    elements.tableBody.innerHTML = requests
      .map((item) => {
        const name = [
          item.submitted_first_name,
          item.submitted_last_name,
        ]
          .filter(Boolean)
          .join(" ");

        const contact =
          item.preferred_contact_method === "email"
            ? item.submitted_email
            : item.preferred_contact_method === "phone"
              ? item.submitted_phone
              : [
                  item.submitted_email,
                  item.submitted_phone,
                ]
                  .filter(Boolean)
                  .join(" / ");

        return `
          <tr class="${
            item.status === "needs_review"
              ? "needs-review-row"
              : ""
          }">
            <td>
              <strong>${escapeHtml(name)}</strong>
              <small>
                ${escapeHtml(
                  [item.submitted_city, item.submitted_state]
                    .filter(Boolean)
                    .join(", ")
                )}
              </small>
            </td>
            <td>
              ${escapeHtml(
                item.requested_service_type
              )}
            </td>
            <td>
              ${formatDate(item.preferred_date)}
              <small>
                ${escapeHtml(
                  item.preferred_time_window || ""
                )}
              </small>
            </td>
            <td>
              ${escapeHtml(contact || "Not provided")}
              <small>
                ${escapeHtml(
                  item.preferred_contact_method || ""
                )}
              </small>
            </td>
            <td>
              <span class="status status-${escapeHtml(
                item.status
              )}">
                ${escapeHtml(
                  prettyStatus(item.status)
                )}
              </span>
              ${
                item.match_status === "conflict"
                  ? '<small class="conflict">Client conflict</small>'
                  : ""
              }
            </td>
            <td>${formatDate(
              item.created_at,
              true
            )}</td>
            <td>
              <button
                class="button secondary"
                type="button"
                data-open-request="${escapeHtml(
                  item.id
                )}"
              >
                Review
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderPagination(returned) {
    const start =
      state.total === 0
        ? 0
        : state.offset + 1;
    const end = Math.min(
      state.offset + returned,
      state.total
    );

    elements.range.textContent =
      `Showing ${start}-${end} of ${state.total}`;

    elements.previous.disabled =
      state.offset === 0;
    elements.next.disabled =
      state.offset + returned >= state.total;
  }

  async function openRequest(id) {
    elements.drawerBody.innerHTML =
      '<div class="state">Loading request…</div>';

    elements.backdrop.hidden = false;
    elements.drawer.classList.add("open");
    elements.drawer.setAttribute(
      "aria-hidden",
      "false"
    );

    try {
      const response =
        await RequestsApi.detail(id);

      state.selected = response.data.request;
      renderDrawer(state.selected);
    } catch (error) {
      elements.drawerBody.innerHTML =
        `<div class="state error">${escapeHtml(
          error.message
        )}</div>`;
    }
  }

  function renderDrawer(item) {
    const name = [
      item.submitted_first_name,
      item.submitted_last_name,
    ]
      .filter(Boolean)
      .join(" ");

    elements.drawerTitle.textContent =
      name || "Cleaning request";

    const addOns = Array.isArray(
      item.requested_add_ons
    )
      ? item.requested_add_ons
      : [];

    const canConvert =
      Boolean(item.client_id) &&
      !item.converted_service_id &&
      !["declined", "archived", "converted"].includes(
        item.status
      );

    elements.drawerBody.innerHTML = `
      ${
        item.match_status === "conflict"
          ? `
            <div class="alert danger">
              <strong>Client match conflict</strong>
              <span>
                Email and phone matched different clients.
                Resolve the client link before conversion.
              </span>
            </div>
          `
          : ""
      }

      <section class="detail-card">
        <h3>Request status</h3>
        <form id="requestUpdateForm">
          <label>
            <span>Status</span>
            <select name="status">
              ${[
                "new",
                "needs_review",
                "contacted",
                "accepted",
                "declined",
                "archived",
              ]
                .map(
                  (status) => `
                    <option
                      value="${status}"
                      ${
                        status === item.status
                          ? "selected"
                          : ""
                      }
                    >
                      ${prettyStatus(status)}
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>

          <label>
            <span>Internal notes</span>
            <textarea
              name="internalNotes"
              rows="5"
              maxlength="10000"
            >${escapeHtml(
              item.internal_notes || ""
            )}</textarea>
          </label>

          <button
            class="button primary"
            type="submit"
          >
            Save request
          </button>
        </form>
      </section>

      <section class="detail-card">
        <h3>Customer</h3>
        ${detail("Submitted name", name)}
        ${detail("Email", item.submitted_email)}
        ${detail("Phone", item.submitted_phone)}
        ${detail(
          "Preferred contact",
          prettyStatus(
            item.preferred_contact_method
          )
        )}
        ${detail(
          "Linked client",
          item.client_id
            ? `${item.client_first_name || ""} ${
                item.client_last_name || ""
              } (${item.client_id})`
            : "Not linked"
        )}
        ${detail(
          "Match result",
          prettyStatus(item.match_status)
        )}
        ${detail(
          "Mailing list",
          item.mailing_list_opt_in
            ? "Opted in"
            : "Not opted in"
        )}
        ${detail("Referred by", item.referred_by)}
      </section>

      <section class="detail-card">
        <h3>Property and service</h3>
        ${detail(
          "Address",
          [
            item.submitted_address_line1,
            item.submitted_address_line2,
            item.submitted_city,
            item.submitted_state,
            item.submitted_postal_code,
          ]
            .filter(Boolean)
            .join(", ")
        )}
        ${detail(
          "Service",
          item.requested_service_type
        )}
        ${detail(
          "Preferred date",
          formatDate(item.preferred_date)
        )}
        ${detail(
          "Time window",
          item.preferred_time_window
        )}
        ${detail(
          "Property type",
          item.property_type
        )}
        ${detail("Bedrooms", item.bedrooms)}
        ${detail("Bathrooms", item.bathrooms)}
        ${detail(
          "Square footage",
          formatSquareFootage(item)
        )}
        ${detail(
          "Condition",
          item.property_condition
        )}
        ${detail(
          "Add-ons",
          addOns.join(", ") || "None"
        )}
        ${detail("Pets", item.pets)}
        ${detail(
          "Entry instructions",
          item.entry_instructions
        )}
        ${detail(
          "Customer notes",
          item.customer_notes
        )}
      </section>

      ${
        item.converted_service_id
          ? `
            <div class="alert success">
              <strong>Converted to service</strong>
              <span>
                ${escapeHtml(
                  item.converted_service_id
                )},
                ${escapeHtml(
                  item.converted_service_type || ""
                )},
                ${formatDate(
                  item.converted_service_start,
                  true
                )}
              </span>
            </div>
          `
          : ""
      }

      ${
        canConvert
          ? `
            <section class="detail-card">
              <h3>Accept & Create Service</h3>
              <p class="conversion-help">
                Confirm the appointment details below. Creating the service
                will mark this request as converted.
              </p>

              <form id="requestConvertForm">
                <label>
                  <span>Service type</span>
                  <input
                    name="serviceType"
                    value="${escapeHtml(
                      item.requested_service_type || ""
                    )}"
                    maxlength="150"
                    required
                  >
                </label>

                <label>
                  <span>Scheduled date</span>
                  <input
                    name="scheduledDate"
                    type="date"
                    value="${escapeHtml(
                      item.preferred_date || ""
                    )}"
                    required
                  >
                </label>

                <label>
                  <span>Scheduled time</span>
                  <input
                    name="scheduledTime"
                    type="time"
                    required
                  >
                  <small>
                    Requested window:
                    ${escapeHtml(
                      item.preferred_time_window || "No preference"
                    )}
                  </small>
                </label>

                <label>
                  <span>Confirmed price *</span>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                  >
                </label>

                <label>
                  <span>Service notes</span>
                  <textarea
                    name="notes"
                    rows="7"
                    maxlength="5000"
                  >${escapeHtml(
                    buildServiceNotes(item)
                  )}</textarea>
                </label>

                <button
                  class="button success"
                  type="submit"
                >
                  Accept & Create Service
                </button>
              </form>
            </section>
          `
          : ""
      }
    `;

    wireDrawerForms(item);
  }

  function detail(label, value) {
    return `
      <div class="detail-row">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(
          value === null ||
          value === undefined ||
          value === ""
            ? "Not provided"
            : value
        )}</strong>
      </div>
    `;
  }

  function wireDrawerForms(item) {
    document
      .getElementById("requestUpdateForm")
      ?.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();

          const form = new FormData(
            event.currentTarget
          );

          await runDrawerAction(
            () =>
              RequestsApi.update(item.id, {
                version: item.version,
                status: form.get("status"),
                internalNotes:
                  form.get("internalNotes"),
              }),
            "Request saved."
          );
        }
      );

    document
      .getElementById("requestConvertForm")
      ?.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();

          const form = new FormData(
            event.currentTarget
          );
          const price = String(
            form.get("price") || ""
          ).trim();

          const priceNumber = Number(price);

          if (
            price === "" ||
            !Number.isFinite(priceNumber) ||
            priceNumber < 0
          ) {
            showToast(
              "Enter the confirmed service price.",
              "error"
            );
            return;
          }

          let scheduledStart;

          try {
            scheduledStart = localDateTimeToIso(
              form.get("scheduledDate"),
              form.get("scheduledTime")
            );
          } catch (error) {
            showToast(error.message, "error");
            return;
          }

          if (
            !window.confirm(
              "Create this scheduled service and mark the request converted?"
            )
          ) {
            return;
          }

          await runDrawerAction(
            () =>
              RequestsApi.convert(item.id, {
                version: item.version,
                serviceType:
                  form.get("serviceType"),
                scheduledStart,
                priceCents:
                  Math.round(priceNumber * 100),
                notes:
                  form.get("notes") || null,
              }),
            "Service created and request converted.",
            {
              closeOnSuccess: true,
              resetToFirstPage: true,
            }
          );
        }
      );
  }

  async function runDrawerAction(
    action,
    successMessage,
    options = {}
  ) {
    const {
      closeOnSuccess = false,
      resetToFirstPage = false,
    } = options;

    const buttons =
      elements.drawerBody.querySelectorAll(
        "button"
      );

    buttons.forEach(
      (button) => (button.disabled = true)
    );

    try {
      const response = await action();

      showToast(
        successMessage,
        "success"
      );

      if (resetToFirstPage) {
        state.offset = 0;
      }

      if (closeOnSuccess) {
        closeDrawer();
        await loadRequests();
        return;
      }

      state.selected =
        response.data.request;

      renderDrawer(
        state.selected
      );

      await loadRequests();
    } catch (error) {
      showToast(
        error.message,
        "error"
      );

      if (
        error.status === 409 &&
        state.selected?.id
      ) {
        await openRequest(
          state.selected.id
        );
      }
    } finally {
      buttons.forEach(
        (button) =>
          (button.disabled = false)
      );
    }
  }

  function closeDrawer() {
    elements.drawer.classList.remove("open");
    elements.drawer.setAttribute(
      "aria-hidden",
      "true"
    );
    elements.backdrop.hidden = true;
    state.selected = null;
  }

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    window.setTimeout(
      () => toast.remove(),
      3200
    );
  }

  let searchTimer = 0;

  elements.search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.search = elements.search.value.trim();
      state.offset = 0;
      loadRequests();
    }, 250);
  });

  elements.status.addEventListener(
    "change",
    () => {
      state.status = elements.status.value;
      state.offset = 0;
      loadRequests();
    }
  );

  elements.refresh.addEventListener(
    "click",
    loadRequests
  );

  elements.previous.addEventListener(
    "click",
    () => {
      state.offset = Math.max(
        0,
        state.offset - PAGE_SIZE
      );
      loadRequests();
    }
  );

  elements.next.addEventListener(
    "click",
    () => {
      state.offset += PAGE_SIZE;
      loadRequests();
    }
  );

  elements.tableBody.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(
        "[data-open-request]"
      );

      if (button) {
        openRequest(
          button.dataset.openRequest
        );
      }
    }
  );

  elements.drawerClose.addEventListener(
    "click",
    closeDrawer
  );
  elements.backdrop.addEventListener(
    "click",
    closeDrawer
  );

  loadRequests();
})();
