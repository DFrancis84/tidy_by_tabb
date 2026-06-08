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
