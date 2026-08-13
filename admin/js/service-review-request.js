(() => {
  const REVIEW_REQUEST_PATH =
    "/admin/api/review-requests";

  let activeServiceId = "";

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

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
        },
        ...options,
      });

    const body =
      await response.json();

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
        "serviceReviewRequestStyles"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "serviceReviewRequestStyles";

    style.textContent = `
      .service-review-request-row {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        margin-top: 12px;
      }

      .service-review-result {
        margin-top: 12px;
        padding: 12px;
        border-radius: 12px;
        background: #eaf3f8;
        color: #385466;
        line-height: 1.45;
      }

      .service-review-result input {
        width: 100%;
        margin: 8px 0;
        min-height: 40px;
        padding: 8px 10px;
        border: 1px solid rgba(22,57,87,.18);
        border-radius: 9px;
        background: white;
      }

      .service-review-result-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
    `;

    document.head.appendChild(
      style
    );
  }

  function ensureMarkup() {
    const drawerBody =
      document.querySelector(
        "#serviceDrawer .drawer-body"
      );

    if (
      !drawerBody ||
      document.getElementById(
        "serviceReviewRequestWrap"
      )
    ) {
      return;
    }

    drawerBody.insertAdjacentHTML(
      "beforeend",
      `
        <div
          id="serviceReviewRequestWrap"
          class="service-review-request-row"
          hidden
        >
          <div style="width:100%;">
            <button
              id="serviceReviewRequestButton"
              class="button button-primary"
              type="button"
            >
              Generate Review Link
            </button>

            <div
              id="serviceReviewRequestResult"
            ></div>
          </div>
        </div>
      `
    );

    document
      .getElementById(
        "serviceReviewRequestButton"
      )
      ?.addEventListener(
        "click",
        generate
      );
  }

  async function syncForService(
    serviceId
  ) {
    activeServiceId =
      serviceId || "";

    ensureMarkup();

    const wrap =
      document.getElementById(
        "serviceReviewRequestWrap"
      );

    const result =
      document.getElementById(
        "serviceReviewRequestResult"
      );

    if (!wrap) {
      return;
    }

    wrap.hidden = true;

    if (result) {
      result.innerHTML = "";
    }

    if (!activeServiceId) {
      return;
    }

    try {
      const response =
        await api(
          `/admin/api/services/${encodeURIComponent(
            activeServiceId
          )}`
        );

      const service =
        response.data?.service ||
        response.data;

      wrap.hidden =
        service?.status !==
        "completed";
    } catch {
      wrap.hidden = true;
    }
  }

  async function generate() {
    if (!activeServiceId) {
      return;
    }

    const button =
      document.getElementById(
        "serviceReviewRequestButton"
      );

    button.disabled = true;
    button.textContent =
      "Generating…";

    try {
      const response =
        await api(
          REVIEW_REQUEST_PATH,
          {
            method: "POST",
            body:
              JSON.stringify({
                serviceId:
                  activeServiceId,
              }),
          }
        );

      renderResult(
        response.data?.request
      );
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

  function renderResult(item) {
    const result =
      document.getElementById(
        "serviceReviewRequestResult"
      );

    if (
      !result ||
      !item
    ) {
      return;
    }

    result.innerHTML = `
      <div
        class="service-review-result"
      >
        <strong>
          Review link ready for
          ${escapeHtml(
            item.clientName
          )}
        </strong>

        <input
          id="serviceReviewUrl"
          value="${escapeHtml(
            item.reviewUrl
          )}"
          readonly
        >

        <div
          class="service-review-result-actions"
        >
          <button
            id="serviceReviewCopy"
            class="button button-secondary"
            type="button"
          >
            Copy Link
          </button>

          <button
            id="serviceReviewEmail"
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
        "serviceReviewCopy"
      )
      ?.addEventListener(
        "click",
        () =>
          copyLink(
            item.reviewUrl
          )
      );

    document
      .getElementById(
        "serviceReviewEmail"
      )
      ?.addEventListener(
        "click",
        () =>
          emailRequest(item)
      );
  }

  async function copyLink(url) {
    try {
      await navigator.clipboard
        .writeText(url);
      window.alert(
        "Review link copied."
      );
    } catch {
      const input =
        document.getElementById(
          "serviceReviewUrl"
        );

      input?.select();
      document.execCommand(
        "copy"
      );
    }
  }

  function emailRequest(item) {
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

    window.location.href =
      `mailto:${encodeURIComponent(
        item.clientEmail
      )}` +
      `?subject=${encodeURIComponent(
        subject
      )}` +
      `&body=${encodeURIComponent(
        body
      )}`;
  }

  function bindServiceClicks() {
    document.addEventListener(
      "click",
      (event) => {
        const button =
          event.target.closest(
            "[data-service-id]"
          );

        if (!button) {
          return;
        }

        const id =
          button.dataset.serviceId ||
          "";

        setTimeout(
          () =>
            syncForService(id),
          250
        );
      },
      true
    );
  }

  function install() {
    installStyles();

    const observer =
      new MutationObserver(
        ensureMarkup
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      }
    );

    ensureMarkup();
    bindServiceClicks();
  }

  install();
})();