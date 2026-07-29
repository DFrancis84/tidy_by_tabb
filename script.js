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

    dialog.close();
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
   GALLERY
========================= */

const GALLERY_API_URL =
  "https://script.google.com/macros/s/AKfycbyLkwoj-c2DqYWpLNaYOgsZi9_FqgvMQm-7a2Zis8TA5zpRDKY6TK4RXtistJV873gw/exec?action=list&published=true&showInGallery=true";

let galleryImages = [];
let galleryState = "loading";

let galleryIndex = 0;

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
    ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`
    : originalUrl;
}

const galleryModal = document.getElementById("galleryModal");
const galleryViewer = document.getElementById("galleryViewer");
const galleryCaption = document.getElementById("galleryCaption");
const galleryPrev = document.querySelector(".gallery-prev");
const galleryNext = document.querySelector(".gallery-next");

function updateGallery() {
  if (!galleryViewer || !galleryCaption) return;

  if (!galleryImages.length) {
    galleryViewer.removeAttribute("src");
    galleryViewer.alt = "";
    galleryCaption.textContent = galleryState === "error"
      ? "We couldn’t load the Gallery right now. Please try again later."
      : galleryState === "empty"
        ? "No Gallery transformations are available yet."
        : "Loading Gallery transformations…";
    updateGalleryControls();
    return;
  }

  galleryIndex = Math.min(galleryIndex, galleryImages.length - 1);
  const image = galleryImages[galleryIndex];

  galleryViewer.onerror = handleGalleryImageError;
  galleryViewer.src = image.src;
  galleryViewer.alt = image.caption || "Cleaning transformation";
  galleryCaption.textContent = image.caption || "Tidy by Tabb transformation";
  updateGalleryControls();
}

function handleGalleryImageError() {
  if (!galleryViewer) return;

  const failedSource = galleryViewer.currentSrc || galleryViewer.src;
  console.error("Unable to display public Gallery image.", failedSource);

  galleryViewer.onerror = null;
  galleryViewer.removeAttribute("src");
  galleryImages = [];
  galleryIndex = 0;
  galleryState = "error";
  updateGallery();
}

function updateGalleryControls() {
  const disabled = galleryImages.length < 2;
  if (galleryPrev) galleryPrev.disabled = disabled;
  if (galleryNext) galleryNext.disabled = disabled;
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
      .filter((record) =>
        record?.published === true &&
        record?.showInGallery === true
      )
      .map((record) => {
        const selectedImageUrl =
          record.comparisonImage ||
          record.afterImage ||
          record.beforeImage ||
          "";

        return {
          src: getGalleryImageUrl(selectedImageUrl),
          caption: record.title,
          category: record.category,
          id: record.id,
        };
      })
      .filter((image) => Boolean(image.src));

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

document.querySelectorAll("[data-gallery-open]").forEach((button) => {
  button.addEventListener("click", () => {
    galleryIndex = 0;
    updateGallery();
    galleryModal?.showModal();
  });
});

galleryPrev?.addEventListener("click", () => {
  if (galleryImages.length < 2) return;
  galleryIndex =
    (galleryIndex - 1 + galleryImages.length) %
    galleryImages.length;

  updateGallery();
});

galleryNext?.addEventListener("click", () => {
  if (galleryImages.length < 2) return;
  galleryIndex =
    (galleryIndex + 1) %
    galleryImages.length;

  updateGallery();
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
