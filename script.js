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

const galleryImages = [
  {
    src: "assets/gallery/kitchen-1.png",
    caption: "Kitchen Refresh"
  },
  {
    src: "assets/gallery/bathroom-1.png",
    caption: "Bathroom Detail"
  },
  {
    src: "assets/gallery/living-room-1.png",
    caption: "Living Area Reset"
  },
  {
    src: "assets/gallery/deep-clean-1.png",
    caption: "Deep Clean"
  }
];

let galleryIndex = 0;

const galleryModal = document.getElementById("galleryModal");
const galleryViewer = document.getElementById("galleryViewer");
const galleryCaption = document.getElementById("galleryCaption");
const galleryPrev = document.querySelector(".gallery-prev");
const galleryNext = document.querySelector(".gallery-next");

function updateGallery() {
  const image = galleryImages[galleryIndex];

  galleryViewer.src = image.src;
  galleryViewer.alt = image.caption;
  galleryCaption.textContent = image.caption;
}

document.querySelectorAll("[data-gallery-open]").forEach((button) => {
  button.addEventListener("click", () => {
    galleryIndex = 0;
    updateGallery();
    galleryModal.showModal();
  });
});

galleryPrev?.addEventListener("click", () => {
  galleryIndex =
    (galleryIndex - 1 + galleryImages.length) %
    galleryImages.length;

  updateGallery();
});

galleryNext?.addEventListener("click", () => {
  galleryIndex =
    (galleryIndex + 1) %
    galleryImages.length;

  updateGallery();
});

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
