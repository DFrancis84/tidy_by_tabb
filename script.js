/* =========================
   ACCESSIBILITY TOGGLE
========================= */

const accessibilityToggle = document.querySelector(".accessibility-toggle");

if (accessibilityToggle) {
  const savedMode = localStorage.getItem("accessibilityMode") === "true";

  document.body.classList.toggle("accessibility-mode", savedMode);
  accessibilityToggle.setAttribute("aria-pressed", savedMode);

  accessibilityToggle.addEventListener("click", () => {
    const isActive = document.body.classList.toggle("accessibility-mode");

    accessibilityToggle.setAttribute("aria-pressed", isActive);
    localStorage.setItem("accessibilityMode", isActive);
  });
}

function updateAccessibilityButton() {
  const btn = document.querySelector(".accessibility-toggle");

  if (!btn) return;

  if (window.innerWidth <= 920) {
    btn.innerHTML = "♿";
    btn.setAttribute("aria-label", "Accessibility Settings");
  } else {
    btn.textContent = "Accessibility";
    btn.removeAttribute("aria-label");
  }
}

window.addEventListener("resize", updateAccessibilityButton);
updateAccessibilityButton();

/* =========================
   MODALS
========================= */

const modalButtons = document.querySelectorAll("[data-modal]");
const closeButtons = document.querySelectorAll(".modal-close");
const documentButtons = document.querySelectorAll("[data-doc]");

const pdfModal = document.getElementById("pdfModal");
const pdfViewer = document.getElementById("pdfViewer");
const imageViewer = document.getElementById("imageViewer");
const pdfModalTitle = document.getElementById("pdfModalTitle");
const pdfDownloadLink = document.getElementById("pdfDownloadLink");

modalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modal = document.getElementById(button.dataset.modal);
    if (modal) modal.showModal();
  });
});

documentButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const path = button.dataset.doc;
    const type = button.dataset.type;
    const title = button.dataset.title || "Customer Document";

    pdfModalTitle.textContent = title;
    pdfDownloadLink.href = path;

    if (type === "image") {
      imageViewer.src = path;
      imageViewer.style.display = "block";

      pdfViewer.src = "";
      pdfViewer.style.display = "none";
    } else {
      pdfViewer.src = path;
      pdfViewer.style.display = "block";

      imageViewer.src = "";
      imageViewer.style.display = "none";
    }

    pdfModal.showModal();
  });
});

closeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = button.closest("dialog");

    if (dialog?.id === "pdfModal") {
      pdfViewer.src = "";
      imageViewer.src = "";
    }

    dialog?.close();
  });
});

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();

    const clickedOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (clickedOutside) {
      if (dialog.id === "pdfModal") {
        pdfViewer.src = "";
        imageViewer.src = "";
      }

      dialog.close();
    }
  });
});

/* =========================
   GALLERY V2 - BEFORE/AFTER SLIDER
========================= */

const GALLERY_API_URL =
  "https://script.google.com/macros/s/AKfycbyLkwoj-c2DqYWpLNaYOgsZi9_FqgvMQm-7a2Zis8TA5zpRDKY6TK4RXtistJV873gw/exec?action=list&published=true&showInGallery=true";

let galleryImages = [];
let galleryState = "loading";
let galleryIndex = 0;
let comparisonPosition = 50;
let isDraggingComparison = false;
let galleryIntroAnimationFrame = 0;
let galleryShouldAnimateIntro = false;
let galleryHandleHasNudged = false;

function getGalleryImageUrl(url) {
  const originalUrl = String(url || "").trim();

  if (!originalUrl || !originalUrl.includes("drive.google.com")) {
    return originalUrl;
  }

  const fileId = [
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/,
    /\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/,
  ]
    .map((pattern) => originalUrl.match(pattern)?.[1])
    .find(Boolean);

  return fileId
    ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w2000`
    : originalUrl;
}

function installGalleryV2Styles() {
  if (document.getElementById("galleryV2Styles")) return;

  const style = document.createElement("style");
  style.id = "galleryV2Styles";
  style.textContent = `
    .gallery-modal.gallery-v2,
    .gallery-modal.gallery-v2[open] {
      display: block !important;
      width: min(1180px, calc(100% - 24px));
      height: fit-content !important;
      block-size: fit-content !important;
      min-height: 0 !important;
      min-block-size: 0 !important;
      max-height: calc(100dvh - 24px) !important;
      max-block-size: calc(100dvh - 24px) !important;
      padding: 18px;
      overflow: auto;
      transition: width 260ms ease, max-width 260ms ease;
      background:
        radial-gradient(circle at top left, rgba(255, 115, 190, 0.22), transparent 28rem),
        radial-gradient(circle at top right, rgba(98, 220, 229, 0.32), transparent 26rem),
        linear-gradient(135deg, #eaf8ff 0%, #f8fbff 45%, #fff1f9 100%);
    }

    .gallery-v2-layout {
      height: auto !important;
      block-size: auto !important;
      min-height: 0 !important;
      min-block-size: 0 !important;
      display: grid;
      align-content: start;
      grid-template-rows: auto auto auto;
      gap: 12px;
    }

    .gallery-modal.gallery-v2.is-portrait {
      width: min(660px, calc(100% - 24px));
    }

    .gallery-modal.gallery-v2.is-square {
      width: min(850px, calc(100% - 24px));
    }

    .gallery-modal.gallery-v2.is-landscape {
      width: min(1180px, calc(100% - 24px));
    }

    .gallery-v2-heading {
      padding: 2px 54px 0;
      text-align: center;
    }

    .gallery-v2-heading h2 {
      margin: 0;
      font-size: clamp(1.4rem, 3vw, 2.3rem);
      line-height: 1.1;
      letter-spacing: -0.045em;
    }

    .gallery-v2-heading p {
      margin: 5px 0 0;
      color: var(--muted);
      font-weight: 750;
    }

    .comparison-stage {
      position: relative;
      width: 100%;
      max-height: calc(100dvh - 190px);
      aspect-ratio: var(--gallery-aspect-ratio, 16 / 9);
      overflow: hidden;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.72);
      box-shadow: var(--shadow);
      user-select: none;
      touch-action: none;
      cursor: ew-resize;
      outline: none;
      transition: aspect-ratio 260ms ease, opacity 220ms ease, transform 220ms ease;
    }

    .comparison-stage.gallery-intro {
      opacity: 0;
      transform: scale(0.985);
    }

    .comparison-stage.gallery-intro.is-visible {
      opacity: 1;
      transform: scale(1);
    }

    .comparison-stage:focus-visible {
      box-shadow:
        0 0 0 4px rgba(40, 189, 210, 0.32),
        var(--shadow);
    }

    .comparison-layer {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .comparison-layer img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: none;
      object-fit: contain;
      object-position: center;
      background: rgba(255, 255, 255, 0.72);
      pointer-events: none;
    }

    .comparison-after {
      clip-path: inset(0 0 0 var(--comparison-position, 50%));
    }

    .comparison-divider {
      position: absolute;
      z-index: 4;
      top: 0;
      bottom: 0;
      left: var(--comparison-position, 50%);
      width: 3px;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.96);
      box-shadow:
        0 0 0 1px rgba(23, 34, 53, 0.1),
        0 0 24px rgba(23, 34, 53, 0.22);
      pointer-events: none;
    }

    .comparison-handle {
      position: absolute;
      z-index: 5;
      left: var(--comparison-position, 50%);
      top: 50%;
      width: 58px;
      height: 58px;
      transform: translate(-50%, -50%);
      display: grid;
      place-items: center;
      border-radius: 50%;
      color: white;
      background: linear-gradient(135deg, var(--pink), var(--teal));
      box-shadow:
        0 12px 32px rgba(21, 45, 75, 0.28),
        0 0 0 5px rgba(255, 255, 255, 0.8);
      font-size: 1.65rem;
      font-weight: 950;
      line-height: 1;
      pointer-events: none;
      transition: transform 180ms ease, filter 180ms ease, box-shadow 180ms ease;
    }

    .comparison-sponge {
      display: block;
      transform: translateY(-2px);
      line-height: 1;
      pointer-events: none;
    }

    .comparison-stage:hover .comparison-handle,
    .comparison-stage:focus-visible .comparison-handle {
      transform: translate(-50%, -50%) scale(1.08);
      filter: drop-shadow(0 0 9px rgba(255, 255, 255, 0.95));
      box-shadow:
        0 14px 36px rgba(21, 45, 75, 0.3),
        0 0 0 5px rgba(255, 255, 255, 0.86),
        0 0 19px rgba(98, 220, 229, 0.56);
    }


    .comparison-handle.is-nudging {
      animation: spongeHandleNudge 520ms ease-in-out;
    }

    @keyframes spongeHandleNudge {
      0%, 100% {
        transform: translate(-50%, -50%);
      }
      28% {
        transform: translate(calc(-50% - 8px), -50%);
      }
      68% {
        transform: translate(calc(-50% + 8px), -50%);
      }
    }

    .comparison-label {
      position: absolute;
      z-index: 6;
      top: 16px;
      width: 112px;
      height: 48px;
      padding: 0;
      display: grid;
      place-items: center;
      border-radius: 999px;
      color: white;
      background: rgba(23, 34, 53, 0.72);
      box-shadow: 0 8px 22px rgba(21, 45, 75, 0.18);
      backdrop-filter: blur(10px);
      font-size: 0.76rem;
      font-weight: 950;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      pointer-events: none;
    }

    .comparison-label.before { left: 18px; }
    .comparison-label.after { right: 18px; }

    .gallery-v2-footer {
      display: grid;
      grid-template-columns: 52px minmax(0, 1fr) 52px;
      align-items: center;
      gap: 12px;
    }

    .gallery-v2 .gallery-arrow {
      position: static;
      transform: none;
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      flex: none;
      padding: 0;
      line-height: 0;
    }

    .gallery-v2 .gallery-arrow svg {
      display: block;
      width: 21px;
      height: 21px;
      margin: 0;
      transform: translate(0, 0);
      overflow: visible;
      pointer-events: none;
    }

    .gallery-v2 .gallery-arrow {
      appearance: none;
      -webkit-appearance: none;
      text-indent: 0;
    }

    .gallery-v2 .gallery-arrow:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .gallery-v2-caption {
      min-width: 0;
      text-align: center;
    }

    .gallery-v2-caption strong {
      display: block;
      color: var(--deep);
      font-size: 1rem;
      font-weight: 950;
      overflow-wrap: anywhere;
    }

    .gallery-v2-caption span {
      display: block;
      margin-top: 2px;
      color: var(--muted);
      font-size: 0.9rem;
      font-weight: 700;
    }

    .gallery-v2-status {
      height: 100%;
      display: grid;
      place-items: center;
      padding: 28px;
      text-align: center;
      color: var(--deep);
      font-weight: 900;
    }

    @media (max-width: 700px) {
      .gallery-modal.gallery-v2,
      .gallery-modal.gallery-v2[open],
      .gallery-modal.gallery-v2.is-portrait,
      .gallery-modal.gallery-v2.is-square,
      .gallery-modal.gallery-v2.is-landscape {
        display: block !important;
        width: calc(100% - 12px);
        height: fit-content !important;
        block-size: fit-content !important;
        min-height: 0 !important;
        min-block-size: 0 !important;
        max-height: calc(100dvh - 12px) !important;
        max-block-size: calc(100dvh - 12px) !important;
        padding: 10px;
        border-radius: 22px;
      }

      .gallery-v2-layout {
        gap: 9px;
      }

      .gallery-v2-heading {
        padding: 4px 44px 0;
      }

      .gallery-v2-heading p {
        display: none;
      }

      .comparison-stage {
        width: 100%;
        height: auto !important;
        block-size: auto !important;
        min-height: 0 !important;
        max-height: calc(100dvh - 155px);
        aspect-ratio: var(--gallery-aspect-ratio, 16 / 9);
        border-radius: 18px;
      }

      .gallery-modal.gallery-v2.is-landscape .comparison-stage {
        max-height: min(58dvh, 520px);
      }

      .gallery-modal.gallery-v2.is-portrait .comparison-stage {
        max-height: calc(100dvh - 155px);
      }

      .comparison-label {
        top: 10px;
        width: 96px;
        height: 40px;
        padding: 0;
        font-size: 0.66rem;
      }

      .comparison-label.before { left: 12px; }
      .comparison-label.after { right: 12px; }

      .comparison-handle {
        width: 40px;
        height: 40px;
        font-size: 1.05rem;
        box-shadow:
          0 9px 23px rgba(21, 45, 75, 0.24),
          0 0 0 4px rgba(255, 255, 255, 0.78);
      }

      .comparison-stage:hover .comparison-handle,
      .comparison-stage:focus-visible .comparison-handle {
        box-shadow:
          0 10px 26px rgba(21, 45, 75, 0.26),
          0 0 0 4px rgba(255, 255, 255, 0.82),
          0 0 15px rgba(98, 220, 229, 0.46);
      }

      .gallery-v2-footer {
        grid-template-columns: 44px minmax(0, 1fr) 44px;
        gap: 8px;
      }

      .gallery-v2 .gallery-arrow {
        width: 42px;
        height: 42px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .gallery-modal.gallery-v2 *,
      .gallery-modal.gallery-v2 *::before,
      .gallery-modal.gallery-v2 *::after {
        scroll-behavior: auto !important;
        transition: none !important;
        animation: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

const galleryModal = document.getElementById("galleryModal");

function installGalleryV2Markup() {
  if (!galleryModal || galleryModal.dataset.galleryV2Ready === "true") return;

  galleryModal.dataset.galleryV2Ready = "true";
  galleryModal.classList.add("gallery-v2");

  galleryModal.innerHTML = `
    <button class="modal-close" type="button" aria-label="Close gallery">×</button>

    <div class="gallery-v2-layout">
      <div class="gallery-v2-heading">
        <h2 id="galleryTitle">Before & After Gallery</h2>
        <p>Drag the divider to reveal the transformation.</p>
      </div>

      <div
        id="comparisonStage"
        class="comparison-stage"
        role="slider"
        tabindex="0"
        aria-label="Before and after image comparison"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow="50"
      >
        <div class="comparison-layer comparison-before">
          <img id="galleryBeforeImage" src="" alt="" draggable="false" />
        </div>

        <div class="comparison-layer comparison-after">
          <img id="galleryAfterImage" src="" alt="" draggable="false" />
        </div>

        <span class="comparison-label before">Before</span>
        <span class="comparison-label after">After</span>
        <span class="comparison-divider" aria-hidden="true"></span>
        <span class="comparison-handle" aria-hidden="true">
          <span class="comparison-sponge">🧽</span>
        </span>

        <div id="galleryStatus" class="gallery-v2-status" hidden></div>
      </div>

      <div class="gallery-v2-footer">
        <button class="gallery-arrow gallery-prev" type="button" aria-label="Previous gallery item">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M15 4L7 12L15 20" fill="none" stroke="currentColor" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="gallery-v2-caption">
          <strong id="galleryCaption">Tidy by Tabb transformation</strong>
          <span id="galleryCategory"></span>
        </div>

        <button class="gallery-arrow gallery-next" type="button" aria-label="Next gallery item">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 4L17 12L9 20" fill="none" stroke="currentColor" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  galleryModal.querySelector(".modal-close")?.addEventListener("click", () => {
    galleryModal.close();
  });
}

installGalleryV2Styles();
installGalleryV2Markup();

const comparisonStage = document.getElementById("comparisonStage");
const galleryBeforeImage = document.getElementById("galleryBeforeImage");
const galleryAfterImage = document.getElementById("galleryAfterImage");
const galleryStatus = document.getElementById("galleryStatus");
const galleryTitle = document.getElementById("galleryTitle");
const galleryCaption = document.getElementById("galleryCaption");
const galleryCategory = document.getElementById("galleryCategory");
const galleryPrev = document.querySelector(".gallery-prev");
const galleryNext = document.querySelector(".gallery-next");

function setComparisonPosition(position) {
  comparisonPosition = Math.min(100, Math.max(0, Number(position) || 0));

  comparisonStage?.style.setProperty(
    "--comparison-position",
    `${comparisonPosition}%`
  );

  comparisonStage?.setAttribute(
    "aria-valuenow",
    String(Math.round(comparisonPosition))
  );
}

function setGalleryStatus(message = "") {
  if (!galleryStatus || !comparisonStage) return;

  const hasMessage = Boolean(message);
  galleryStatus.hidden = !hasMessage;
  galleryStatus.textContent = message;

  comparisonStage
    .querySelectorAll(
      ".comparison-layer, .comparison-label, .comparison-divider, .comparison-handle"
    )
    .forEach((element) => {
      element.style.visibility = hasMessage ? "hidden" : "visible";
    });
}

function updateGalleryControls() {
  const disabled = galleryImages.length < 2;

  if (galleryPrev) galleryPrev.disabled = disabled;
  if (galleryNext) galleryNext.disabled = disabled;
}

function applyGalleryOrientation() {
  if (!galleryModal || !comparisonStage || !galleryBeforeImage) return;

  const width = galleryBeforeImage.naturalWidth;
  const height = galleryBeforeImage.naturalHeight;

  if (!width || !height) return;

  const ratio = width / height;
  const clampedRatio = Math.min(2.1, Math.max(0.58, ratio));

  comparisonStage.style.setProperty(
    "--gallery-aspect-ratio",
    `${width} / ${height}`
  );

  galleryModal.classList.remove("is-portrait", "is-square", "is-landscape");

  if (ratio < 0.86) {
    galleryModal.classList.add("is-portrait");
  } else if (ratio > 1.16) {
    galleryModal.classList.add("is-landscape");
  } else {
    galleryModal.classList.add("is-square");
  }
}

function runGalleryIntroAnimation() {
  if (!comparisonStage || !galleryModal?.open || !galleryShouldAnimateIntro) {
    return;
  }

  galleryShouldAnimateIntro = false;
  cancelAnimationFrame(galleryIntroAnimationFrame);

  comparisonStage.classList.add("gallery-intro");
  setComparisonPosition(4);

  requestAnimationFrame(() => {
    comparisonStage.classList.add("is-visible");
  });

  const duration = 680;
  const startTime = performance.now();

  const animate = (now) => {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);

    setComparisonPosition(4 + (46 * eased));

    if (progress < 1) {
      galleryIntroAnimationFrame = requestAnimationFrame(animate);
      return;
    }

    setComparisonPosition(50);

    window.setTimeout(() => {
      comparisonStage.classList.remove("gallery-intro", "is-visible");

      if (!galleryHandleHasNudged) {
        const handle = comparisonStage.querySelector(".comparison-handle");

        galleryHandleHasNudged = true;

        window.setTimeout(() => {
          handle?.classList.add("is-nudging");

          window.setTimeout(() => {
            handle?.classList.remove("is-nudging");
          }, 560);
        }, 140);
      }
    }, 180);
  };

  galleryIntroAnimationFrame = requestAnimationFrame(animate);
}

function handleGalleryImagesReady() {
  if (
    !galleryBeforeImage?.complete ||
    !galleryAfterImage?.complete ||
    !galleryBeforeImage.naturalWidth ||
    !galleryAfterImage.naturalWidth
  ) {
    return;
  }

  applyGalleryOrientation();
  runGalleryIntroAnimation();
}

function updateGallery() {
  if (
    !galleryBeforeImage ||
    !galleryAfterImage ||
    !galleryCaption ||
    !galleryCategory
  ) {
    return;
  }

  if (!galleryImages.length) {
    galleryBeforeImage.removeAttribute("src");
    galleryAfterImage.removeAttribute("src");
    galleryBeforeImage.alt = "";
    galleryAfterImage.alt = "";

    const message =
      galleryState === "error"
        ? "We couldn’t load the Gallery right now. Please try again later."
        : galleryState === "empty"
          ? "No Gallery transformations are available yet."
          : "Loading Gallery transformations…";

    galleryCaption.textContent = "Before & After Gallery";
    galleryCategory.textContent = "";
    setGalleryStatus(message);
    updateGalleryControls();
    return;
  }

  galleryIndex = Math.min(galleryIndex, galleryImages.length - 1);
  const image = galleryImages[galleryIndex];

  setGalleryStatus("");
  setComparisonPosition(50);

  galleryBeforeImage.onerror = handleGalleryImageError;
  galleryAfterImage.onerror = handleGalleryImageError;
  galleryBeforeImage.onload = handleGalleryImagesReady;
  galleryAfterImage.onload = handleGalleryImagesReady;

  galleryBeforeImage.src = image.beforeSrc;
  galleryAfterImage.src = image.afterSrc;

  galleryBeforeImage.alt = `Before: ${image.caption || "cleaning transformation"}`;
  galleryAfterImage.alt = `After: ${image.caption || "cleaning transformation"}`;

  galleryTitle.textContent = image.caption || "Before & After Gallery";
  galleryCaption.textContent = image.caption || "Tidy by Tabb transformation";
  galleryCategory.textContent = image.category || "";

  updateGalleryControls();
}

function handleGalleryImageError(event) {
  const failedSource = event?.currentTarget?.currentSrc || event?.currentTarget?.src;
  console.error("Unable to display public Gallery image.", failedSource);

  galleryImages = [];
  galleryIndex = 0;
  galleryState = "error";
  updateGallery();
}

async function loadGalleryImages() {
  galleryState = "loading";
  updateGallery();

  try {
    const response = await fetch(GALLERY_API_URL);

    if (!response.ok) {
      throw new Error(`Gallery request failed (${response.status}).`);
    }

    const payload = await response.json();
    const records = Array.isArray(payload.data) ? payload.data : [];

    galleryImages = records
      .filter(
        (record) =>
          record?.published === true &&
          record?.showInGallery === true
      )
      .map((record) => ({
        beforeSrc: getGalleryImageUrl(record.beforeImage),
        afterSrc: getGalleryImageUrl(record.afterImage),
        comparisonSrc: getGalleryImageUrl(record.comparisonImage),
        caption: record.title,
        category: record.category,
        id: record.id,
      }))
      .filter((image) => Boolean(image.beforeSrc && image.afterSrc));

    galleryIndex = 0;
    galleryState = galleryImages.length ? "ready" : "empty";
  } catch (error) {
    galleryImages = [];
    galleryIndex = 0;
    galleryState = "error";
    console.error("Unable to load public Gallery records.", error);
  }

  updateGallery();
}

function updateComparisonFromPointer(event) {
  if (!comparisonStage) return;

  const rect = comparisonStage.getBoundingClientRect();
  const x = Math.min(rect.right, Math.max(rect.left, event.clientX));
  const percentage = ((x - rect.left) / rect.width) * 100;

  setComparisonPosition(percentage);
}

comparisonStage?.addEventListener("pointerdown", (event) => {
  isDraggingComparison = true;
  comparisonStage.setPointerCapture?.(event.pointerId);
  updateComparisonFromPointer(event);
});

comparisonStage?.addEventListener("pointermove", (event) => {
  if (!isDraggingComparison) return;
  updateComparisonFromPointer(event);
});

comparisonStage?.addEventListener("pointerup", (event) => {
  isDraggingComparison = false;
  comparisonStage.releasePointerCapture?.(event.pointerId);
});

comparisonStage?.addEventListener("pointercancel", () => {
  isDraggingComparison = false;
});

comparisonStage?.addEventListener("keydown", (event) => {
  const steps = event.shiftKey ? 10 : 2;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setComparisonPosition(comparisonPosition - steps);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    setComparisonPosition(comparisonPosition + steps);
  }

  if (event.key === "Home") {
    event.preventDefault();
    setComparisonPosition(0);
  }

  if (event.key === "End") {
    event.preventDefault();
    setComparisonPosition(100);
  }
});

document.querySelectorAll("[data-gallery-open]").forEach((button) => {
  button.addEventListener("click", () => {
    galleryIndex = 0;
    galleryShouldAnimateIntro = true;
    updateGallery();
    galleryModal?.showModal();

    window.setTimeout(() => {
      handleGalleryImagesReady();
      comparisonStage?.focus();
    }, 50);
  });
});

galleryPrev?.addEventListener("click", () => {
  if (galleryImages.length < 2) return;

  galleryIndex =
    (galleryIndex - 1 + galleryImages.length) %
    galleryImages.length;

  galleryShouldAnimateIntro = true;
  updateGallery();
});

galleryNext?.addEventListener("click", () => {
  if (galleryImages.length < 2) return;

  galleryIndex =
    (galleryIndex + 1) %
    galleryImages.length;

  galleryShouldAnimateIntro = true;
  updateGallery();
});

document.addEventListener("keydown", (event) => {
  if (!galleryModal?.open) return;

  if (event.key === "Escape") {
    galleryModal.close();
    return;
  }

  if (document.activeElement === comparisonStage) return;

  if (event.key === "ArrowLeft" && galleryImages.length > 1) {
    galleryIndex =
      (galleryIndex - 1 + galleryImages.length) %
      galleryImages.length;
    galleryShouldAnimateIntro = true;
    updateGallery();
  }

  if (event.key === "ArrowRight" && galleryImages.length > 1) {
    galleryIndex =
      (galleryIndex + 1) %
      galleryImages.length;
    galleryShouldAnimateIntro = true;
    updateGallery();
  }
});

loadGalleryImages();

/* =========================
   PRICING COVERFLOW
========================= */

const coverflowCards =
  Array.from(document.querySelectorAll(".coverflow-card"));

const pricePrev =
  document.querySelector(".price-prev");

const priceNext =
  document.querySelector(".price-next");

let activePriceIndex = 1; // Deep Cleaning first

function updatePriceCoverflow() {
  coverflowCards.forEach((card) => {
    card.classList.remove(
      "active",
      "prev",
      "next",
      "hidden-card"
    );
  });

  const total = coverflowCards.length;

  const prevIndex =
    (activePriceIndex - 1 + total) % total;

  const nextIndex =
    (activePriceIndex + 1) % total;

  coverflowCards[activePriceIndex]
    .classList.add("active");

  coverflowCards[prevIndex]
    .classList.add("prev");

  coverflowCards[nextIndex]
    .classList.add("next");

  coverflowCards.forEach((card, index) => {
    if (
      index !== activePriceIndex &&
      index !== prevIndex &&
      index !== nextIndex
    ) {
      card.classList.add("hidden-card");
    }
  });
}

if (coverflowCards.length) {
  updatePriceCoverflow();

  pricePrev?.addEventListener("click", () => {
    activePriceIndex =
      (activePriceIndex - 1 + coverflowCards.length) %
      coverflowCards.length;

    updatePriceCoverflow();
  });

  priceNext?.addEventListener("click", () => {
    activePriceIndex =
      (activePriceIndex + 1) %
      coverflowCards.length;

    updatePriceCoverflow();
  });
}

/* =========================
   SOCIAL BUBBLE
========================= */

const socialBubble =
  document.querySelector(".social-bubble");

const socialToggle =
  document.querySelector(".social-toggle");

if (socialBubble && socialToggle) {
  socialToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    socialBubble.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    socialBubble.classList.remove("open");
  });

  socialBubble.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}
