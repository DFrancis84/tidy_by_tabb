(() => {
  const API_BASE =
    "/admin/api/cleaning-request-conflicts";

  let currentRequestId = "";
  let renderToken = 0;

  const drawerBody =
    document.getElementById(
      "drawerBody"
    );

  if (!drawerBody) {
    return;
  }

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll(
        "'",
        "&#039;"
      );

  function installStyles() {
    if (
      document.getElementById(
        "requestConflictStyles"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "requestConflictStyles";

    style.textContent = `
      .conflict-resolution-card {
        border-color: #efb4c2;
        background: #fff8fa;
      }

      .conflict-resolution-card > p {
        color: var(--muted);
      }

      .conflict-candidate-list {
        display: grid;
        gap: 10px;
      }

      .conflict-candidate {
        display: grid;
        grid-template-columns:
          minmax(0, 1fr) auto;
        align-items: center;
        gap: 14px;
        padding: 14px;
        border: 1px solid #efb4c2;
        border-radius: 13px;
        background: white;
      }

      .conflict-candidate-info {
        display: grid;
        gap: 3px;
        min-width: 0;
      }

      .conflict-candidate-info span,
      .conflict-candidate-info small {
        overflow-wrap: anywhere;
      }

      .conflict-candidate-info small {
        color: var(--muted);
      }

      .conflict-match-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 5px;
      }

      .conflict-match-badges span {
        display: inline-flex;
        width: fit-content;
        padding: 4px 7px;
        border-radius: 999px;
        color: #7c2740;
        background: #ffe2ea;
        font-size: .74rem;
        font-weight: 850;
      }

      .conflict-resolution-status {
        margin-top: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        font-weight: 800;
      }

      .conflict-resolution-status.error {
        color: #8f2440;
        background: #ffe8ee;
      }

      .conflict-resolution-status.success {
        color: #17634e;
        background: #e6f8f1;
      }

      @media (max-width: 620px) {
        .conflict-candidate {
          grid-template-columns: 1fr;
        }

        .conflict-candidate button {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }

  async function api(
    requestId,
    options = {}
  ) {
    const response =
      await fetch(
        `${API_BASE}/${encodeURIComponent(
          requestId
        )}`,
        {
          credentials:
            "same-origin",
          headers: {
            Accept:
              "application/json",
            "Content-Type":
              "application/json",
          },
          ...options,
        }
      );

    let body;

    try {
      body =
        await response.json();
    } catch {
      throw new Error(
        `The conflict service returned an unreadable response (${response.status}).`
      );
    }

    if (
      !response.ok ||
      body?.success !== true
    ) {
      const error =
        new Error(
          body?.message ||
          `Conflict request failed (${response.status}).`
        );

      error.status =
        response.status;

      throw error;
    }

    return body;
  }

  function findConflictAlert() {
    return Array.from(
      drawerBody.querySelectorAll(
        ".alert.danger"
      )
    ).find((element) =>
      element.textContent
        .toLowerCase()
        .includes(
          "client match conflict"
        )
    );
  }

  async function enhanceConflict() {
    const alert =
      findConflictAlert();

    if (
      !alert ||
      !currentRequestId
    ) {
      return;
    }

    if (
      drawerBody.querySelector(
        "[data-conflict-resolution]"
      )
    ) {
      return;
    }

    const token =
      ++renderToken;

    const section =
      document.createElement(
        "section"
      );

    section.className =
      "detail-card conflict-resolution-card";

    section.dataset
      .conflictResolution = "true";

    section.innerHTML = `
      <h3>Resolve client</h3>
      <p>
        Loading the customers that
        matched this request...
      </p>
    `;

    alert.insertAdjacentElement(
      "afterend",
      section
    );

    try {
      const response =
        await api(
          currentRequestId
        );

      if (
        token !== renderToken ||
        !section.isConnected
      ) {
        return;
      }

      const candidates =
        response.data
          ?.candidates || [];

      const version =
        response.data
          ?.version;

      if (!candidates.length) {
        section.innerHTML = `
          <h3>Resolve client</h3>
          <p>
            No matching active clients
            were found. Refresh the
            request and try again.
          </p>
        `;
        return;
      }

      section.innerHTML = `
        <h3>Resolve client</h3>
        <p>
          Compare the submitted contact
          details and choose the correct
          customer record.
        </p>

        <div class="conflict-candidate-list">
          ${candidates
            .map(
              (client) => `
                <article class="conflict-candidate">
                  <div class="conflict-candidate-info">
                    <strong>
                      ${escapeHtml(
                        [
                          client.first_name,
                          client.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      )}
                    </strong>

                    <span>
                      ${escapeHtml(
                        client.email ||
                        "No email"
                      )}
                    </span>

                    <span>
                      ${escapeHtml(
                        client.phone ||
                        "No phone"
                      )}
                    </span>

                    <small>
                      ${escapeHtml(
                        [
                          client.city,
                          client.state,
                        ]
                          .filter(Boolean)
                          .join(", ")
                      )}
                    </small>

                    <div class="conflict-match-badges">
                      ${
                        client.matchedByEmail
                          ? "<span>Email match</span>"
                          : ""
                      }
                      ${
                        client.matchedByPhone
                          ? "<span>Phone match</span>"
                          : ""
                      }
                    </div>
                  </div>

                  <button
                    class="button secondary"
                    type="button"
                    data-use-conflict-client="${escapeHtml(
                      client.id
                    )}"
                  >
                    Use this client
                  </button>
                </article>
              `
            )
            .join("")}
        </div>

        <div
          class="conflict-resolution-status"
          data-conflict-status
          hidden
        ></div>
      `;

      section
        .querySelectorAll(
          "[data-use-conflict-client]"
        )
        .forEach((button) => {
          button.addEventListener(
            "click",
            () =>
              resolveClient({
                requestId:
                  currentRequestId,
                version,
                clientId:
                  button.dataset
                    .useConflictClient,
                clientName:
                  button
                    .closest(
                      ".conflict-candidate"
                    )
                    ?.querySelector(
                      "strong"
                    )
                    ?.textContent
                    ?.trim() ||
                  "this client",
                section,
              })
          );
        });
    } catch (error) {
      if (
        token !== renderToken
      ) {
        return;
      }

      section.innerHTML = `
        <h3>Resolve client</h3>
        <div class="conflict-resolution-status error">
          ${escapeHtml(
            error.message
          )}
        </div>
      `;
    }
  }

  async function resolveClient({
    requestId,
    version,
    clientId,
    clientName,
    section,
  }) {
    if (
      !window.confirm(
        `Link this request to ${clientName}?`
      )
    ) {
      return;
    }

    const buttons =
      section.querySelectorAll(
        "button"
      );

    buttons.forEach(
      (button) =>
        (button.disabled = true)
    );

    const status =
      section.querySelector(
        "[data-conflict-status]"
      );

    try {
      await api(
        requestId,
        {
          method: "POST",
          body: JSON.stringify({
            version,
            clientId,
          }),
        }
      );

      if (status) {
        status.hidden = false;
        status.className =
          "conflict-resolution-status success";
        status.textContent =
          "Client linked. Refreshing request...";
      }

      document
        .getElementById(
          "drawerClose"
        )
        ?.click();

      document
        .getElementById(
          "requestRefresh"
        )
        ?.click();

      window.setTimeout(
        () => {
          document
            .querySelector(
              `[data-open-request="${CSS.escape(
                requestId
              )}"]`
            )
            ?.click();
        },
        650
      );
    } catch (error) {
      if (status) {
        status.hidden = false;
        status.className =
          "conflict-resolution-status error";
        status.textContent =
          error.message;
      }

      buttons.forEach(
        (button) =>
          (button.disabled = false)
      );
    }
  }

  document.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-open-request]"
        );

      if (!button) {
        return;
      }

      currentRequestId =
        button.dataset
          .openRequest || "";

      ++renderToken;
    },
    true
  );

  const observer =
    new MutationObserver(
      () => {
        window.setTimeout(
          enhanceConflict,
          0
        );
      }
    );

  installStyles();

  observer.observe(
    drawerBody,
    {
      childList: true,
      subtree: true,
    }
  );
})();
