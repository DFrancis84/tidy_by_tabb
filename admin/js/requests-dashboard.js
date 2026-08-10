import {
  switchView,
} from "./ui.js?v=20260804-9";

const REQUESTS_VIEW = "requests";
const REQUESTS_PAGE = "requests.html?embedded=1";

function installStyles() {
  if (
    document.getElementById(
      "requestsDashboardStyles"
    )
  ) {
    return;
  }

  const style = document.createElement("style");
  style.id = "requestsDashboardStyles";
  style.textContent = `
    .requests-dashboard-panel {
      min-height: calc(100dvh - 128px);
    }

    .requests-dashboard-frame-wrap {
      min-height: calc(100dvh - 150px);
      overflow: hidden;
      border: 1px solid var(--border, #dfe8ef);
      border-radius: var(--radius, 18px);
      background: #f5f9fc;
      box-shadow: var(
        --shadow,
        0 18px 55px rgba(27, 61, 88, 0.1)
      );
    }

    .requests-dashboard-frame {
      display: block;
      width: 100%;
      min-height: calc(100dvh - 152px);
      border: 0;
      background: #f5f9fc;
    }

    @media (max-width: 760px) {
      .requests-dashboard-panel {
        min-height: calc(100dvh - 96px);
      }

      .requests-dashboard-frame-wrap,
      .requests-dashboard-frame {
        min-height: calc(100dvh - 110px);
      }
    }
  `;

  document.head.appendChild(style);
}

function createRequestsPanel() {
  let panel = document.querySelector(
    '[data-view-panel="requests"]'
  );

  if (panel) {
    return panel;
  }

  panel = document.createElement("section");
  panel.className =
    "view requests-dashboard-panel";
  panel.dataset.viewPanel = REQUESTS_VIEW;

  panel.innerHTML = `
    <div class="requests-dashboard-frame-wrap">
      <iframe
        id="requestsDashboardFrame"
        class="requests-dashboard-frame"
        title="Cleaning Requests"
        loading="eager"
      ></iframe>
    </div>
  `;

  const galleryPanel = document.querySelector(
    '[data-view-panel="gallery"]'
  );

  if (galleryPanel) {
    galleryPanel.before(panel);
  } else {
    document
      .querySelector(".main-content")
      ?.appendChild(panel);
  }

  return panel;
}

function prepareEmbeddedPage(frame) {
  try {
    const frameDocument =
      frame.contentDocument;

    if (!frameDocument) {
      return;
    }

    const topbar = frameDocument.querySelector(
      ".requests-topbar"
    );

    if (topbar) {
      topbar.hidden = true;
    }

    const shell = frameDocument.querySelector(
      ".requests-shell"
    );

    if (shell) {
      shell.style.width = "100%";
      shell.style.margin = "0";
      shell.style.padding = "0";
    }

    const panel = frameDocument.querySelector(
      ".panel"
    );

    if (panel) {
      panel.style.border = "0";
      panel.style.borderRadius = "0";
      panel.style.boxShadow = "none";
      panel.style.minHeight = "100dvh";
    }

    frameDocument.body.style.background =
      "#f5f9fc";
  } catch (error) {
    console.warn(
      "Requests frame styling could not be applied:",
      error
    );
  }
}

function ensureRequestsLoaded() {
  const frame = document.getElementById(
    "requestsDashboardFrame"
  );

  if (!frame) {
    return;
  }

  if (!frame.getAttribute("src")) {
    frame.addEventListener(
      "load",
      () => prepareEmbeddedPage(frame)
    );

    frame.setAttribute(
      "src",
      REQUESTS_PAGE
    );
  }
}

function showRequestsView(event) {
  event?.preventDefault();

  switchView(REQUESTS_VIEW);

  const title =
    document.getElementById("pageTitle");

  if (title) {
    title.textContent = "Requests";
  }

  const primaryAction =
    document.getElementById("primaryAction");

  if (primaryAction) {
    primaryAction.hidden = true;
    primaryAction.dataset.actionView = "";
  }

  ensureRequestsLoaded();
}

function installRequestsNavigation() {
  const existingLink =
    document.querySelector(
      '.sidebar-nav a[href="requests.html"]'
    );

  if (!existingLink) {
    return;
  }

  existingLink.dataset.view = REQUESTS_VIEW;
  existingLink.setAttribute(
    "aria-label",
    "Open cleaning requests"
  );

  existingLink.addEventListener(
    "click",
    showRequestsView
  );
}

function install() {
  installStyles();
  createRequestsPanel();
  installRequestsNavigation();

  document.addEventListener(
    "cms:viewchange",
    (event) => {
      if (
        event.detail?.view === REQUESTS_VIEW
      ) {
        const title =
          document.getElementById("pageTitle");

        if (title) {
          title.textContent = "Requests";
        }

        const primaryAction =
          document.getElementById(
            "primaryAction"
          );

        if (primaryAction) {
          primaryAction.hidden = true;
          primaryAction.dataset.actionView = "";
        }

        ensureRequestsLoaded();
      }
    }
  );
}

install();
