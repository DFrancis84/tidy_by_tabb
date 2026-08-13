(() => {
  const REVIEW_PATH = "/admin/api/reviews";
  const CLIENT_PATH = "/admin/api/clients";
  const SERVICE_PATH = "/admin/api/services";
  const PAGE_SIZE = 25;

  const state = {
    installed: false,
    loaded: false,
    loading: false,
    search: "",
    status: "",
    rating: "",
    offset: 0,
    total: 0,
    reviews: [],
    selected: null,
    clients: [],
    services: [],
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  function prettyStatus(value) {
    return String(value || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatDate(value) {
    if (!value) return "Not provided";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return "Not provided";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function toDateInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateInputToIso(value) {
    if (!value) return null;

    const match = String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (!match) {
      throw new Error("Review date is invalid.");
    }

    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12,
      0,
      0,
      0
    );

    if (Number.isNaN(date.getTime())) {
      throw new Error("Review date is invalid.");
    }

    return date.toISOString();
  }

  function stars(rating) {
    const value = Number(rating || 0);
    return `<span class="review-stars" aria-label="${value} out of 5 stars">${"★".repeat(value)}${"☆".repeat(Math.max(0, 5 - value))}</span>`;
  }

  function clientName(record) {
    return [
      record.client_first_name,
      record.client_last_name,
    ]
      .filter(Boolean)
      .join(" ");
  }


  async function api(url, options = {}) {
    const response = await fetch(url, {
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

  const ReviewApi = {
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

      return api(
        `${REVIEW_PATH}${query.toString() ? `?${query}` : ""}`
      );
    },

    detail(id) {
      return api(
        `${REVIEW_PATH}/${encodeURIComponent(id)}`
      );
    },

    create(payload) {
      return api(REVIEW_PATH, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    update(id, payload) {
      return api(
        `${REVIEW_PATH}/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );
    },

    remove(id, version) {
      return api(
        `${REVIEW_PATH}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          body: JSON.stringify({ version }),
        }
      );
    },
  };

  function installStyles() {
    if (
      document.getElementById("reviewsCmsStyles")
    ) {
      return;
    }

    const style = document.createElement("style");
    style.id = "reviewsCmsStyles";
    style.textContent = `
      #developerToggle,
      #developerPanel {
        display: none !important;
      }

      .reviews-manager {
        display: grid;
        gap: 18px;
      }

      .review-summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .review-summary-card {
        padding: 16px;
        border: 1px solid rgba(22,57,87,.12);
        border-radius: 16px;
        background: rgba(255,255,255,.82);
      }

      .review-summary-card span {
        display: block;
        color: var(--muted);
        font-size: .82rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .06em;
      }

      .review-summary-card strong {
        display: block;
        margin-top: 5px;
        color: var(--deep);
        font-size: 1.7rem;
      }

      .review-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: end;
        gap: 10px;
      }

      .review-toolbar label {
        display: grid;
        gap: 5px;
      }

      .review-toolbar label:first-child {
        flex: 1 1 300px;
      }

      .review-toolbar span {
        color: var(--muted);
        font-size: .8rem;
        font-weight: 850;
      }

      .review-toolbar input,
      .review-toolbar select,
      .review-form input,
      .review-form select,
      .review-form textarea {
        width: 100%;
        min-height: 42px;
        padding: 9px 11px;
        border: 1px solid rgba(22,57,87,.2);
        border-radius: 10px;
        background: white;
        color: var(--deep);
        font: inherit;
      }

      .review-table-wrap {
        overflow-x: auto;
      }

      .reviews-table {
        width: 100%;
        border-collapse: collapse;
      }

      .reviews-table th,
      .reviews-table td {
        padding: 13px 11px;
        border-bottom: 1px solid rgba(22,57,87,.1);
        text-align: left;
        vertical-align: top;
      }

      .reviews-table th {
        color: var(--muted);
        font-size: .78rem;
        text-transform: uppercase;
        letter-spacing: .04em;
      }

      .reviews-table td small {
        display: block;
        margin-top: 4px;
        color: var(--muted);
      }

      .review-stars {
        white-space: nowrap;
        color: #d79d16;
        font-size: 1.05rem;
        letter-spacing: .04em;
      }

      .review-status {
        display: inline-flex;
        align-items: center;
        padding: 5px 8px;
        border-radius: 999px;
        font-size: .75rem;
        font-weight: 900;
        text-transform: capitalize;
      }

      .review-status-published {
        color: #16604a;
        background: #e2f6ef;
      }

      .review-status-draft {
        color: #735813;
        background: #fff3cf;
      }

      .review-status-hidden {
        color: #6a3341;
        background: #f8e7ec;
      }

      .review-text-preview {
        max-width: 360px;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.45;
      }

      .review-pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-top: 12px;
      }

      .review-pagination-actions {
        display: flex;
        gap: 8px;
      }

      .review-empty,
      .review-loading,
      .review-error {
        padding: 28px 18px;
        border-radius: 14px;
        text-align: center;
        background: rgba(255,255,255,.6);
      }

      .review-error {
        color: #8d243c;
        background: #fff0f3;
      }

      .review-drawer-backdrop {
        position: fixed;
        inset: 0;
        z-index: 250;
        background: rgba(11, 32, 47, .4);
        backdrop-filter: blur(2px);
      }

      .review-drawer {
        position: fixed;
        top: 0;
        right: 0;
        z-index: 260;
        width: min(560px, 100%);
        height: 100dvh;
        display: grid;
        grid-template-rows: auto 1fr auto;
        background: #f7fbfd;
        box-shadow: -18px 0 55px rgba(12,36,53,.22);
        transform: translateX(102%);
        transition: transform .2s ease;
      }

      .review-drawer.is-open {
        transform: translateX(0);
      }

      .review-drawer-header,
      .review-drawer-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 20px;
        background: white;
        border-bottom: 1px solid rgba(22,57,87,.12);
      }

      .review-drawer-actions {
        border-top: 1px solid rgba(22,57,87,.12);
        border-bottom: 0;
      }

      .review-drawer-body {
        overflow: auto;
        padding: 20px;
      }

      .review-form {
        display: grid;
        gap: 15px;
      }

      .review-form label {
        display: grid;
        gap: 6px;
      }

      .review-form label > span {
        color: var(--deep);
        font-weight: 850;
      }

      .review-form small {
        color: var(--muted);
      }

      .review-form textarea {
        min-height: 150px;
        resize: vertical;
      }

      .review-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .review-rating-picker {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
      }

      .review-rating-picker input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .review-rating-picker label {
        display: grid;
        place-items: center;
        min-height: 46px;
        border: 1px solid rgba(22,57,87,.15);
        border-radius: 10px;
        background: white;
        color: #b2b7bc;
        font-size: 1.45rem;
        cursor: pointer;
      }

      .review-rating-picker input:checked + label,
      .review-rating-picker label:hover {
        color: #d79d16;
        border-color: #e1b447;
        background: #fff9e7;
      }

      .review-linked-note {
        padding: 10px 12px;
        border-radius: 10px;
        color: #385466;
        background: #eaf3f8;
        font-size: .88rem;
        line-height: 1.45;
      }

      @media (max-width: 900px) {
        .review-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .review-summary-grid,
        .review-form-row {
          grid-template-columns: 1fr;
        }

        .review-toolbar {
          display: grid;
          grid-template-columns: 1fr;
        }

        .review-pagination {
          align-items: stretch;
          flex-direction: column;
        }

        .review-pagination-actions button {
          flex: 1;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function installPanel() {
    const panel = document.querySelector(
      '[data-view-panel="reviews"]'
    );

    if (!panel) {
      return;
    }

    panel.innerHTML = `
      <section class="panel reviews-manager">
        <div class="panel-heading panel-heading-wrap">
          <div>
            <p class="eyebrow">Customer feedback</p>
            <h2>Reviews</h2>
            <p class="panel-description">
              Manage customer reviews and prepare review requests for clients.
            </p>
          </div>

          <div class="review-toolbar">
            <label>
              <span>Search</span>
              <input
                id="reviewSearch"
                type="search"
                placeholder="Reviewer or review text"
                autocomplete="off"
              >
            </label>

            <label>
              <span>Status</span>
              <select id="reviewStatusFilter">
                <option value="">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>

            <label>
              <span>Rating</span>
              <select id="reviewRatingFilter">
                <option value="">All ratings</option>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </label>

            <button
              id="reviewRefresh"
              class="button button-secondary"
              type="button"
            >
              Refresh
            </button>
          </div>
        </div>

        <div class="review-summary-grid">
          <article class="review-summary-card">
            <span>Total</span>
            <strong id="reviewStatTotal">0</strong>
          </article>
          <article class="review-summary-card">
            <span>Published</span>
            <strong id="reviewStatPublished">0</strong>
          </article>
          <article class="review-summary-card">
            <span>Draft / Hidden</span>
            <strong id="reviewStatPrivate">0</strong>
          </article>
          <article class="review-summary-card">
            <span>Avg. Rating</span>
            <strong id="reviewStatAverage">—</strong>
          </article>
        </div>

        <div id="reviewLoading" class="review-loading">
          Loading reviews…
        </div>

        <div id="reviewError" class="review-error" hidden></div>

        <div id="reviewEmpty" class="review-empty" hidden>
          <strong>No reviews found.</strong>
          <div>Add a review or adjust the filters.</div>
        </div>

        <div id="reviewTableWrap" class="review-table-wrap" hidden>
          <table class="reviews-table">
            <thead>
              <tr>
                <th>Reviewer</th>
                <th>Rating</th>
                <th>Review</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="reviewTableBody"></tbody>
          </table>
        </div>

        <div id="reviewPagination" class="review-pagination" hidden>
          <span id="reviewRange">Showing 0 reviews</span>
          <div class="review-pagination-actions">
            <button
              id="reviewPrevious"
              class="button button-secondary"
              type="button"
            >
              Previous
            </button>
            <button
              id="reviewNext"
              class="button button-secondary"
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    `;

    if (
      !document.getElementById(
        "reviewDrawer"
      )
    ) {
      document.body.insertAdjacentHTML(
        "beforeend",
        `
          <div
            id="reviewDrawerBackdrop"
            class="review-drawer-backdrop"
            hidden
          ></div>

          <aside
            id="reviewDrawer"
            class="review-drawer"
            aria-hidden="true"
          >
            <header class="review-drawer-header">
              <div>
                <p class="eyebrow">Customer feedback</p>
                <h2 id="reviewDrawerTitle">Add review</h2>
              </div>

              <button
                id="reviewDrawerClose"
                class="icon-button"
                type="button"
                aria-label="Close review editor"
              >
                ×
              </button>
            </header>

            <div
              id="reviewDrawerBody"
              class="review-drawer-body"
            ></div>

            <footer class="review-drawer-actions">
              <button
                id="reviewDelete"
                class="button button-danger"
                type="button"
                hidden
              >
                Delete
              </button>

              <div>
                <button
                  id="reviewCancel"
                  class="button button-secondary"
                  type="button"
                >
                  Cancel
                </button>

                <button
                  id="reviewSave"
                  class="button button-primary"
                  type="button"
                >
                  Save review
                </button>
              </div>
            </footer>
          </aside>
        `
      );
    }
  }

  function elements() {
    return {
      search: document.getElementById("reviewSearch"),
      status: document.getElementById("reviewStatusFilter"),
      rating: document.getElementById("reviewRatingFilter"),
      refresh: document.getElementById("reviewRefresh"),
      loading: document.getElementById("reviewLoading"),
      error: document.getElementById("reviewError"),
      empty: document.getElementById("reviewEmpty"),
      tableWrap: document.getElementById("reviewTableWrap"),
      tableBody: document.getElementById("reviewTableBody"),
      pagination: document.getElementById("reviewPagination"),
      range: document.getElementById("reviewRange"),
      previous: document.getElementById("reviewPrevious"),
      next: document.getElementById("reviewNext"),
      statTotal: document.getElementById("reviewStatTotal"),
      statPublished: document.getElementById("reviewStatPublished"),
      statPrivate: document.getElementById("reviewStatPrivate"),
      statAverage: document.getElementById("reviewStatAverage"),
      drawer: document.getElementById("reviewDrawer"),
      backdrop: document.getElementById("reviewDrawerBackdrop"),
      drawerTitle: document.getElementById("reviewDrawerTitle"),
      drawerBody: document.getElementById("reviewDrawerBody"),
      drawerClose: document.getElementById("reviewDrawerClose"),
      cancel: document.getElementById("reviewCancel"),
      save: document.getElementById("reviewSave"),
      deleteButton: document.getElementById("reviewDelete"),
    };
  }

  function setPanelLoading() {
    const el = elements();
    el.loading.hidden = false;
    el.error.hidden = true;
    el.empty.hidden = true;
    el.tableWrap.hidden = true;
    el.pagination.hidden = true;
  }

  async function loadReviews() {
    if (state.loading) return;

    state.loading = true;
    setPanelLoading();

    const el = elements();

    try {
      const response = await ReviewApi.list({
        search: state.search,
        status: state.status,
        rating: state.rating,
        limit: PAGE_SIZE,
        offset: state.offset,
      });

      state.reviews =
        response.data?.reviews || [];
      state.total =
        Number(response.metadata?.total || 0);

      renderRows();
      renderPagination();
      renderStats();

      el.loading.hidden = true;
      el.empty.hidden =
        state.reviews.length > 0;
      el.tableWrap.hidden =
        state.reviews.length === 0;
      el.pagination.hidden =
        state.total === 0;

      state.loaded = true;
    } catch (error) {
      el.loading.hidden = true;
      el.error.hidden = false;
      el.error.textContent = error.message;
    } finally {
      state.loading = false;
    }
  }

  async function loadSummaryStats() {
    try {
      const [
        all,
        published,
        drafts,
        hidden,
      ] = await Promise.all([
        ReviewApi.list({
          limit: 100,
          offset: 0,
        }),
        ReviewApi.list({
          status: "published",
          limit: 100,
          offset: 0,
        }),
        ReviewApi.list({
          status: "draft",
          limit: 100,
          offset: 0,
        }),
        ReviewApi.list({
          status: "hidden",
          limit: 100,
          offset: 0,
        }),
      ]);

      const reviews =
        all.data?.reviews || [];

      const el = elements();

      el.statTotal.textContent =
        all.metadata?.total ?? reviews.length;

      el.statPublished.textContent =
        published.metadata?.total ?? 0;

      el.statPrivate.textContent =
        Number(drafts.metadata?.total || 0) +
        Number(hidden.metadata?.total || 0);

      const ratings = reviews
        .map((review) => Number(review.rating))
        .filter(Number.isFinite);

      el.statAverage.textContent =
        ratings.length
          ? (
              ratings.reduce(
                (sum, rating) => sum + rating,
                0
              ) / ratings.length
            ).toFixed(1)
          : "—";
    } catch {
      // The table itself is the authoritative UI.
    }
  }

  function renderStats() {
    loadSummaryStats();
  }

  function renderRows() {
    const el = elements();

    el.tableBody.innerHTML =
      state.reviews
        .map((review) => {
          const linkedClient =
            clientName(review);

          return `
            <tr>
              <td>
                <strong>
                  ${escapeHtml(review.reviewer_name)}
                </strong>
                ${
                  linkedClient
                    ? `<small>Client: ${escapeHtml(linkedClient)}</small>`
                    : ""
                }
              </td>

              <td>${stars(review.rating)}</td>

              <td>
                <div class="review-text-preview">
                  ${escapeHtml(review.review_text)}
                </div>
                ${
                  review.service_type
                    ? `<small>${escapeHtml(review.service_type)}</small>`
                    : ""
                }
              </td>

              <td>
                <span class="review-status review-status-${escapeHtml(review.status)}">
                  ${escapeHtml(prettyStatus(review.status))}
                </span>
              </td>

              <td>
                ${escapeHtml(formatDate(review.review_date))}
              </td>

              <td>
                <button
                  class="button button-secondary"
                  type="button"
                  data-review-open="${escapeHtml(review.id)}"
                >
                  Edit
                </button>
              </td>
            </tr>
          `;
        })
        .join("");
  }

  function renderPagination() {
    const el = elements();

    const start =
      state.total === 0
        ? 0
        : state.offset + 1;

    const end =
      Math.min(
        state.offset + state.reviews.length,
        state.total
      );

    el.range.textContent =
      `Showing ${start}-${end} of ${state.total}`;

    el.previous.disabled =
      state.offset === 0;

    el.next.disabled =
      state.offset + state.reviews.length >=
      state.total;
  }

  async function loadReferenceData() {
    if (
      state.clients.length ||
      state.services.length
    ) {
      return;
    }

    const [clients, services] =
      await Promise.all([
        api(
          `${CLIENT_PATH}?limit=100&offset=0`
        ),
        api(
          `${SERVICE_PATH}?limit=100&offset=0`
        ),
      ]);

    state.clients =
      clients.data?.clients || [];

    state.services =
      services.data?.services || [];
  }

  function clientOptions(selectedId = "") {
    const options = [
      `<option value="">Not linked to a client</option>`,
    ];

    state.clients.forEach((client) => {
      const name = [
        client.first_name,
        client.last_name,
      ]
        .filter(Boolean)
        .join(" ");

      options.push(`
        <option
          value="${escapeHtml(client.id)}"
          ${client.id === selectedId ? "selected" : ""}
        >
          ${escapeHtml(name || client.email || client.id)}
        </option>
      `);
    });

    return options.join("");
  }

  function serviceOptions(
    selectedId = "",
    clientId = ""
  ) {
    const options = [
      `<option value="">Not linked to a service</option>`,
    ];

    state.services
      .filter(
        (service) =>
          !clientId ||
          service.client_id === clientId
      )
      .forEach((service) => {
        const name = [
          service.client_first_name,
          service.client_last_name,
        ]
          .filter(Boolean)
          .join(" ");

        const label = [
          service.service_type,
          name,
          formatDate(service.scheduled_start),
        ]
          .filter(Boolean)
          .join(" • ");

        options.push(`
          <option
            value="${escapeHtml(service.id)}"
            ${service.id === selectedId ? "selected" : ""}
          >
            ${escapeHtml(label)}
          </option>
        `);
      });

    return options.join("");
  }

  async function openDrawer(reviewId = "") {
    const el = elements();

    el.backdrop.hidden = false;
    el.drawer.classList.add("is-open");
    el.drawer.setAttribute(
      "aria-hidden",
      "false"
    );

    el.drawerBody.innerHTML =
      `<div class="review-loading">Loading editor…</div>`;

    el.save.disabled = true;
    el.deleteButton.hidden = true;

    try {
      await loadReferenceData();

      let review = null;

      if (reviewId) {
        const response =
          await ReviewApi.detail(reviewId);
        review = response.data?.review || null;
      }

      state.selected = review;
      renderDrawer(review);
    } catch (error) {
      el.drawerBody.innerHTML =
        `<div class="review-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderDrawer(review) {
    const el = elements();

    const isEdit = Boolean(review);

    el.drawerTitle.textContent =
      isEdit ? "Edit review" : "Add review";

    el.deleteButton.hidden = !isEdit;
    el.save.textContent =
      isEdit ? "Save changes" : "Create review";
    el.save.disabled = false;

    const selectedClientId =
      review?.client_id || "";
    const selectedServiceId =
      review?.service_id || "";

    const defaultDate =
      review?.review_date
        ? toDateInput(review.review_date)
        : toDateInput(new Date().toISOString());

    el.drawerBody.innerHTML = `
      <form id="reviewEditorForm" class="review-form">
        <label>
          <span>Reviewer name *</span>
          <input
            name="reviewerName"
            maxlength="200"
            value="${escapeHtml(review?.reviewer_name || "")}"
            required
          >
        </label>

        <div>
          <span style="display:block;font-weight:850;margin-bottom:6px;">
            Rating *
          </span>

          <div class="review-rating-picker">
            ${[1,2,3,4,5]
              .map((rating) => `
                <input
                  id="reviewRating${rating}"
                  name="rating"
                  type="radio"
                  value="${rating}"
                  ${Number(review?.rating || 5) === rating ? "checked" : ""}
                >
                <label for="reviewRating${rating}">
                  ${rating}★
                </label>
              `)
              .join("")}
          </div>
        </div>

        <label>
          <span>Review *</span>
          <textarea
            name="reviewText"
            maxlength="10000"
            required
          >${escapeHtml(review?.review_text || "")}</textarea>
        </label>

        <div>
          <label>
            <span>Review date</span>
            <input
              name="reviewDate"
              type="date"
              value="${escapeHtml(defaultDate)}"
            >
          </label>
        </div>

        <label>
          <span>Display status *</span>
          <select name="status" required>
            ${[
              ["published", "Published"],
              ["draft", "Draft"],
              ["hidden", "Hidden"],
            ]
              .map(([value, label]) => `
                <option
                  value="${value}"
                  ${String(review?.status || "published") === value ? "selected" : ""}
                >
                  ${label}
                </option>
              `)
              .join("")}
          </select>

          <small>
            Published reviews are ready for the website. Draft and Hidden
            reviews remain internal.
          </small>
        </label>

        <label>
          <span>Link to client</span>
          <select name="clientId" id="reviewClientSelect">
            ${clientOptions(selectedClientId)}
          </select>
        </label>

        <label>
          <span>Link to service</span>
          <select name="serviceId" id="reviewServiceSelect">
            ${serviceOptions(
              selectedServiceId,
              selectedClientId
            )}
          </select>
        </label>

        <div class="review-linked-note">
          Linking is optional. When a Service is selected, the backend
          automatically validates and links the correct Client.
        </div>

        ${
          review
            ? `
              <div class="review-linked-note">
                Last updated ${escapeHtml(
                  formatDateTime(review.updated_at)
                )}.
                Version ${escapeHtml(review.version)}.
              </div>
            `
            : ""
        }
      </form>
    `;

    document
      .getElementById("reviewClientSelect")
      ?.addEventListener(
        "change",
        (event) => {
          const serviceSelect =
            document.getElementById(
              "reviewServiceSelect"
            );

          if (!serviceSelect) return;

          serviceSelect.innerHTML =
            serviceOptions(
              "",
              event.target.value
            );
        }
      );
  }

  function closeDrawer() {
    const el = elements();

    el.drawer.classList.remove("is-open");
    el.drawer.setAttribute(
      "aria-hidden",
      "true"
    );
    el.backdrop.hidden = true;
    state.selected = null;
  }

  async function saveDrawer() {
    const el = elements();
    const form =
      document.getElementById(
        "reviewEditorForm"
      );

    if (!form) return;

    if (!form.reportValidity()) {
      return;
    }

    const formData =
      new FormData(form);

    const rating =
      Number(formData.get("rating"));

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      window.alert(
        "Choose a rating from 1 to 5 stars."
      );
      return;
    }

    let reviewDate = null;

    try {
      reviewDate =
        dateInputToIso(
          formData.get("reviewDate")
        );
    } catch (error) {
      window.alert(error.message);
      return;
    }

    const payload = {
      clientId:
        String(formData.get("clientId") || "") ||
        null,
      serviceId:
        String(formData.get("serviceId") || "") ||
        null,
      reviewerName:
        String(formData.get("reviewerName") || "").trim(),
      rating,
      reviewText:
        String(formData.get("reviewText") || "").trim(),
      reviewDate,
      status:
        String(formData.get("status") || "published"),
    };

    el.save.disabled = true;
    el.save.textContent =
      state.selected
        ? "Saving…"
        : "Creating…";

    try {
      if (state.selected) {
        await ReviewApi.update(
          state.selected.id,
          {
            version:
              state.selected.version,
            ...payload,
          }
        );
      } else {
        await ReviewApi.create(payload);
      }

      closeDrawer();
      state.offset = 0;
      await loadReviews();

      window.dispatchEvent(
        new CustomEvent(
          "tidy:review-saved"
        )
      );
    } catch (error) {
      window.alert(error.message);
    } finally {
      const current = elements();
      current.save.disabled = false;
      current.save.textContent =
        state.selected
          ? "Save changes"
          : "Create review";
    }
  }

  async function deleteReview() {
    const review = state.selected;

    if (!review) return;

    if (
      !window.confirm(
        `Delete the review from ${review.reviewer_name}?`
      )
    ) {
      return;
    }

    const el = elements();
    el.deleteButton.disabled = true;

    try {
      await ReviewApi.remove(
        review.id,
        review.version
      );

      closeDrawer();
      state.offset = 0;
      await loadReviews();
    } catch (error) {
      window.alert(error.message);
    } finally {
      elements().deleteButton.disabled =
        false;
    }
  }

  function bind() {
    const el = elements();

    let timer;

    el.search?.addEventListener(
      "input",
      (event) => {
        clearTimeout(timer);

        timer = setTimeout(() => {
          state.search =
            event.target.value.trim();
          state.offset = 0;
          loadReviews();
        }, 250);
      }
    );

    el.status?.addEventListener(
      "change",
      (event) => {
        state.status =
          event.target.value;
        state.offset = 0;
        loadReviews();
      }
    );

    el.rating?.addEventListener(
      "change",
      (event) => {
        state.rating =
          event.target.value;
        state.offset = 0;
        loadReviews();
      }
    );

    el.refresh?.addEventListener(
      "click",
      () => loadReviews()
    );

    el.previous?.addEventListener(
      "click",
      () => {
        state.offset =
          Math.max(
            0,
            state.offset - PAGE_SIZE
          );
        loadReviews();
      }
    );

    el.next?.addEventListener(
      "click",
      () => {
        if (
          state.offset +
            state.reviews.length <
          state.total
        ) {
          state.offset += PAGE_SIZE;
          loadReviews();
        }
      }
    );

    el.tableBody?.addEventListener(
      "click",
      (event) => {
        const button =
          event.target.closest(
            "[data-review-open]"
          );

        if (!button) return;

        openDrawer(
          button.dataset.reviewOpen
        );
      }
    );

    el.drawerClose?.addEventListener(
      "click",
      closeDrawer
    );

    el.cancel?.addEventListener(
      "click",
      closeDrawer
    );

    el.backdrop?.addEventListener(
      "click",
      closeDrawer
    );

    el.save?.addEventListener(
      "click",
      saveDrawer
    );

    el.deleteButton?.addEventListener(
      "click",
      deleteReview
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          elements().drawer.classList.contains(
            "is-open"
          )
        ) {
          closeDrawer();
        }
      }
    );

    document.addEventListener(
      "cms:viewchange",
      (event) => {
        if (
          event.detail?.view !==
          "reviews"
        ) {
          return;
        }

        const action =
          document.getElementById(
            "primaryAction"
          );

        if (action) {
          action.hidden = false;
          action.textContent =
            "Add review";
          action.dataset.actionView =
            "reviews";
        }

        if (!state.loaded) {
          loadReviews();
        }
      }
    );

    // Capture before script.js's old placeholder handler can act.
    document
      .getElementById("primaryAction")
      ?.addEventListener(
        "click",
        (event) => {
          const action =
            event.currentTarget;

          if (
            action.dataset.actionView !==
            "reviews"
          ) {
            return;
          }

          event.stopImmediatePropagation();
          openDrawer();
        },
        true
      );
  }

  function install() {
    if (state.installed) return;

    document
      .getElementById("developerToggle")
      ?.setAttribute("hidden", "");

    document
      .getElementById("developerPanel")
      ?.setAttribute("hidden", "");

    installStyles();
    installPanel();
    bind();

    state.installed = true;

    const active =
      document.querySelector(
        '[data-view="reviews"].is-active'
      );

    if (active) {
      loadReviews();
    }
  }

  install();
})();