(() => {
  const REVIEW_REQUESTS_PATH =
    "/admin/api/review-requests";

  const SERVICES_PATH =
    "/admin/api/services";

  const state = {
    installed: false,
    services: [],
    requests: [],
    generated: null,
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const formatDate = (value) => {
    if (!value) {
      return "Not provided";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        dateStyle: "medium",
      }
    ).format(date);
  };

  const formatDateTime =
    (value) => {
      if (!value) {
        return "Not provided";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return String(value);
      }

      return new Intl.DateTimeFormat(
        "en-US",
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      ).format(date);
    };

  async function api(
    url,
    options = {}
  ) {
    const response =
      await fetch(url, {
        credentials:
          "same-origin",
        headers: {
          Accept:
            "application/json",
          "Content-Type":
            "application/json",
          ...(options.headers ||
            {}),
        },
        ...options,
      });

    let body;

    try {
      body =
        await response.json();
    } catch {
      throw new Error(
        `The server returned an unreadable response (${response.status}).`
      );
    }

    if (
      !response.ok ||
      body?.success !== true
    ) {
      throw new Error(
        body?.message ||
          `Request failed (${response.status}).`
      );
    }

    return body;
  }

  function installStyles() {
    if (
      document.getElementById(
        "reviewRequestStyles"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "reviewRequestStyles";

    style.textContent = `
      .review-request-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 300;
        background:
          rgba(11,32,47,.42);
        backdrop-filter:
          blur(3px);
      }

      .review-request-modal {
        position: fixed;
        inset:
          50% auto auto 50%;
        z-index: 310;
        width:
          min(620px, calc(100% - 28px));
        max-height:
          min(760px, calc(100dvh - 28px));
        overflow: auto;
        transform:
          translate(-50%, -50%);
        border-radius: 18px;
        background: #f7fbfd;
        box-shadow:
          0 30px 90px
          rgba(12,36,53,.3);
      }

      .review-request-modal header {
        display: flex;
        align-items: center;
        justify-content:
          space-between;
        gap: 12px;
        padding: 18px 20px;
        border-bottom:
          1px solid
          rgba(22,57,87,.12);
        background: white;
      }

      .review-request-body {
        display: grid;
        gap: 16px;
        padding: 20px;
      }

      .review-request-body label {
        display: grid;
        gap: 6px;
      }

      .review-request-body label > span {
        color: var(--deep);
        font-weight: 850;
      }

      .review-request-body select,
      .review-request-body input {
        width: 100%;
        min-height: 42px;
        padding: 9px 11px;
        border:
          1px solid
          rgba(22,57,87,.2);
        border-radius: 10px;
        background: white;
        color: var(--deep);
        font: inherit;
      }

      .review-request-note {
        padding: 12px;
        border-radius: 10px;
        color: #385466;
        background: #eaf3f8;
        line-height: 1.5;
        font-size: .9rem;
      }

      .review-request-generated {
        display: grid;
        gap: 10px;
        padding: 14px;
        border-radius: 12px;
        background:
          rgba(255,255,255,.88);
        border:
          1px solid
          rgba(22,57,87,.12);
      }

      .review-request-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .review-request-history {
        display: grid;
        gap: 8px;
      }

      .review-request-history-item {
        display: grid;
        grid-template-columns:
          1fr auto;
        gap: 10px;
        padding: 11px 12px;
        border-radius: 10px;
        background:
          rgba(255,255,255,.7);
        border:
          1px solid
          rgba(22,57,87,.1);
      }

      .review-request-history-item small {
        display: block;
        margin-top: 3px;
        color: var(--muted);
      }

      .review-request-status {
        align-self: start;
        padding: 4px 8px;
        border-radius: 999px;
        background: #eaf3f8;
        color: #385466;
        font-size: .74rem;
        font-weight: 900;
        text-transform: capitalize;
      }
    `;

    document.head.appendChild(
      style
    );
  }

  function installModal() {
    if (
      document.getElementById(
        "reviewRequestModal"
      )
    ) {
      return;
    }

    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <div
          id="reviewRequestBackdrop"
          class="review-request-modal-backdrop"
          hidden
        ></div>

        <section
          id="reviewRequestModal"
          class="review-request-modal"
          hidden
          aria-hidden="true"
        >
          <header>
            <div>
              <p class="eyebrow">
                Review request
              </p>
              <h2>
                Request a Review
              </h2>
            </div>

            <button
              id="reviewRequestClose"
              class="icon-button"
              type="button"
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <div
            id="reviewRequestBody"
            class="review-request-body"
          ></div>
        </section>
      `
    );
  }

  function installButton() {
    const reviewsPanel =
      document.querySelector(
        '[data-view-panel="reviews"]'
      );

    if (!reviewsPanel) {
      return;
    }

    const refresh =
      reviewsPanel.querySelector(
        "#reviewRefresh"
      );

    if (
      !refresh ||
      document.getElementById(
        "reviewRequestOpen"
      )
    ) {
      return;
    }

    refresh.insertAdjacentHTML(
      "afterend",
      `
        <button
          id="reviewRequestOpen"
          class="button button-primary"
          type="button"
        >
          Request Review
        </button>
      `
    );

    document
      .getElementById(
        "reviewRequestOpen"
      )
      ?.addEventListener(
        "click",
        openModal
      );
  }

  async function openModal() {
    const modal =
      document.getElementById(
        "reviewRequestModal"
      );

    const backdrop =
      document.getElementById(
        "reviewRequestBackdrop"
      );

    modal.hidden = false;
    backdrop.hidden = false;

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    renderLoading();

    try {
      await Promise.all([
        loadCompletedServices(),
        loadRequestHistory(),
      ]);

      renderForm();
    } catch (error) {
      renderError(
        error.message
      );
    }
  }

  function closeModal() {
    const modal =
      document.getElementById(
        "reviewRequestModal"
      );

    const backdrop =
      document.getElementById(
        "reviewRequestBackdrop"
      );

    modal.hidden = true;
    backdrop.hidden = true;

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    state.generated = null;
  }

  function renderLoading() {
    document.getElementById(
      "reviewRequestBody"
    ).innerHTML = `
      <div class="review-loading">
        Loading completed services…
      </div>
    `;
  }

  function renderError(message) {
    document.getElementById(
      "reviewRequestBody"
    ).innerHTML = `
      <div class="review-error">
        ${escapeHtml(message)}
      </div>
    `;
  }

  async function loadCompletedServices() {
    const response =
      await api(
        `${SERVICES_PATH}?status=completed&limit=100&offset=0`
      );

    state.services =
      response.data?.services ||
      [];
  }

  async function loadRequestHistory() {
    const response =
      await api(
        `${REVIEW_REQUESTS_PATH}?limit=8&offset=0`
      );

    state.requests =
      response.data?.requests ||
      [];
  }

  function serviceLabel(
    service
  ) {
    const name = [
      service.client_first_name,
      service.client_last_name,
    ]
      .filter(Boolean)
      .join(" ");

    return [
      name,
      service.service_type,
      formatDate(
        service.completed_at ||
          service.scheduled_start
      ),
    ]
      .filter(Boolean)
      .join(" • ");
  }

  function renderForm() {
    const body =
      document.getElementById(
        "reviewRequestBody"
      );

    const options =
      state.services
        .map(
          (service) => `
            <option
              value="${escapeHtml(
                service.id
              )}"
            >
              ${escapeHtml(
                serviceLabel(
                  service
                )
              )}
            </option>
          `
        )
        .join("");

    const history =
      state.requests.length
        ? state.requests
            .map(
              (item) => `
                <div
                  class="review-request-history-item"
                >
                  <div>
                    <strong>
                      ${escapeHtml(
                        [
                          item.client_first_name,
                          item.client_last_name,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      )}
                    </strong>
                    <small>
                      ${escapeHtml(
                        item.service_type ||
                          ""
                      )}
                      •
                      ${escapeHtml(
                        formatDateTime(
                          item.created_at
                        )
                      )}
                    </small>
                  </div>

                  <span
                    class="review-request-status"
                  >
                    ${escapeHtml(
                      item.status
                    )}
                  </span>
                </div>
              `
            )
            .join("")
        : `
            <div
              class="review-request-note"
            >
              No review requests yet.
            </div>
          `;

    body.innerHTML = `
      <label>
        <span>
          Completed service
        </span>

        <select
          id="reviewRequestService"
          ${state.services.length
            ? ""
            : "disabled"}
        >
          <option value="">
            Select a completed service
          </option>
          ${options}
        </select>
      </label>

      ${
        state.services.length
          ? `
            <button
              id="reviewRequestGenerate"
              class="button button-primary"
              type="button"
            >
              Generate Review Link
            </button>
          `
          : `
            <div
              class="review-request-note"
            >
              There are no completed services available.
              Complete a Service first, then generate its review request.
            </div>
          `
      }

      <div
        id="reviewRequestGenerated"
      ></div>

      <div>
        <p class="eyebrow">
          Recent requests
        </p>

        <div
          class="review-request-history"
        >
          ${history}
        </div>
      </div>

      <div
        class="review-request-note"
      >
        Links expire after 30 days.
        Generating a new link for the same service revokes the previous one.
      </div>
    `;

    document
      .getElementById(
        "reviewRequestGenerate"
      )
      ?.addEventListener(
        "click",
        generateRequest
      );
  }

  async function generateRequest() {
    const select =
      document.getElementById(
        "reviewRequestService"
      );

    const serviceId =
      String(
        select?.value || ""
      );

    if (!serviceId) {
      window.alert(
        "Select a completed service."
      );
      return;
    }

    const button =
      document.getElementById(
        "reviewRequestGenerate"
      );

    button.disabled = true;
    button.textContent =
      "Generating…";

    try {
      const response =
        await api(
          REVIEW_REQUESTS_PATH,
          {
            method: "POST",
            body:
              JSON.stringify({
                serviceId,
              }),
          }
        );

      state.generated =
        response.data?.request ||
        null;

      await loadRequestHistory();

      renderGenerated();
    } catch (error) {
      window.alert(
        error.message
      );
    } finally {
      button.disabled = false;
      button.textContent =
        "Generate Review Link";
    }
  }

  function renderGenerated() {
    const target =
      document.getElementById(
        "reviewRequestGenerated"
      );

    const item =
      state.generated;

    if (!target || !item) {
      return;
    }

    target.innerHTML = `
      <div
        class="review-request-generated"
      >
        <strong>
          Review link ready for
          ${escapeHtml(
            item.clientName
          )}
        </strong>

        <input
          id="reviewRequestUrl"
          value="${escapeHtml(
            item.reviewUrl
          )}"
          readonly
        >

        <small>
          Expires
          ${escapeHtml(
            formatDateTime(
              item.expiresAt
            )
          )}
        </small>

        <div
          class="review-request-actions"
        >
          <button
            id="reviewRequestCopy"
            class="button button-secondary"
            type="button"
          >
            Copy Link
          </button>

          <button
            id="reviewRequestEmail"
            class="button button-primary"
            type="button"
          >
            Email Review Request
          </button>
        </div>
      </div>
    `;

    document
      .getElementById(
        "reviewRequestCopy"
      )
      ?.addEventListener(
        "click",
        copyLink
      );

    document
      .getElementById(
        "reviewRequestEmail"
      )
      ?.addEventListener(
        "click",
        emailRequest
      );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        state.generated.reviewUrl
      );

      window.alert(
        "Review link copied."
      );
    } catch {
      const input =
        document.getElementById(
          "reviewRequestUrl"
        );

      input?.select();
      document.execCommand(
        "copy"
      );

      window.alert(
        "Review link copied."
      );
    }
  }

  function emailRequest() {
    const item =
      state.generated;

    if (!item) {
      return;
    }

    const firstName =
      String(
        item.clientName || ""
      )
        .trim()
        .split(/\s+/)[0] ||
      "there";

    const subject =
      "How did Tidy by Tabb do?";

    const body = [
      `Hi ${firstName},`,
      "",
      "Thank you for choosing Tidy by Tabb! I would love to hear how your cleaning went.",
      "",
      "You can leave a quick review here:",
      item.reviewUrl,
      "",
      "Thank you for trusting me with your space!",
      "",
      "Tabb",
      "Tidy by Tabb",
    ].join("\n");

    const href =
      `mailto:${encodeURIComponent(
        item.clientEmail
      )}` +
      `?subject=${encodeURIComponent(
        subject
      )}` +
      `&body=${encodeURIComponent(
        body
      )}`;

    window.location.href =
      href;
  }

  function bindModal() {
    document
      .getElementById(
        "reviewRequestClose"
      )
      ?.addEventListener(
        "click",
        closeModal
      );

    document
      .getElementById(
        "reviewRequestBackdrop"
      )
      ?.addEventListener(
        "click",
        closeModal
      );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
            "Escape" &&
          !document
            .getElementById(
              "reviewRequestModal"
            )
            ?.hidden
        ) {
          closeModal();
        }
      }
    );
  }

  function install() {
    if (state.installed) {
      return;
    }

    installStyles();
    installModal();
    bindModal();

    const observer =
      new MutationObserver(() => {
        installButton();
      });

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      }
    );

    installButton();

    state.installed = true;
  }

  install();
})();