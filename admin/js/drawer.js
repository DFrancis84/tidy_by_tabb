import { getPreviewUrl, normalizeRecord } from "./utils.js";
import { loading, toast } from "./ui.js";
import { ComparisonComposer } from "./composer.js";
import { ImageCropper } from "./cropper.js";

const DEFAULT_CATEGORIES = [
  "Bathroom",
  "Bedroom",
  "Kitchen",
  "Living Room",
  "Move-In / Move-Out",
  "Deep Clean",
  "Organization",
  "Commercial",
  "Other",
];

const WORKFLOW_STEPS = ["details", "before", "after", "publishing"];

export class GalleryDrawer {
  constructor({ api, onSaved, onDeleted } = {}) {
    this.api = api;
    this.onSaved = typeof onSaved === "function" ? onSaved : () => {};
    this.onDeleted = typeof onDeleted === "function" ? onDeleted : () => {};
    this.currentRecord = null;
    this.categoryOptions = [];
    this.scrollPosition = 0;
    this.pendingDeleteId = "";
    this.cropper = new ImageCropper();

    this.drawer = document.getElementById("galleryDrawer");
    this.backdrop = document.getElementById("drawerBackdrop");
    this.form = document.getElementById("galleryForm");
    this.title = document.getElementById("drawerTitle");
    this.saveButton = document.getElementById("saveRecord");
    this.deleteButton = document.getElementById("deleteRecord");
    this.publishReadiness = document.getElementById("publishReadiness");

    this.fields = {
      id: document.getElementById("recordId"),
      title: document.getElementById("recordTitle"),
      category: document.getElementById("recordCategory"),
      beforeImage: document.getElementById("beforeImage"),
      afterImage: document.getElementById("afterImage"),
      comparisonImage: document.getElementById("comparisonImage"),
      status: document.getElementById("recordStatus"),
      featured: document.getElementById("recordFeatured"),
    };

    this.photoControls = {
      before: {
        inputs: [document.getElementById("beforeFile"), document.getElementById("beforeCamera")],
        dropZone: document.getElementById("beforeDropZone"),
        preview: document.getElementById("beforePreview"),
        status: document.getElementById("beforeUploadStatus"),
        urlField: this.fields.beforeImage,
      },
      after: {
        inputs: [document.getElementById("afterFile"), document.getElementById("afterCamera")],
        dropZone: document.getElementById("afterDropZone"),
        preview: document.getElementById("afterPreview"),
        status: document.getElementById("afterUploadStatus"),
        urlField: this.fields.afterImage,
      },
    };

    this.workflowCards = new Map(
      WORKFLOW_STEPS.map((step) => [
        step,
        document.querySelector(`[data-workflow-step="${step}"]`),
      ])
    );

    this.progressDots = new Map(
      WORKFLOW_STEPS.map((step) => [
        step,
        document.querySelector(`[data-progress-step="${step}"]`),
      ])
    );

    this.stepChecks = new Map(
      WORKFLOW_STEPS.map((step) => [
        step,
        document.querySelector(`[data-step-check="${step}"]`),
      ])
    );

    this.deleteModal = document.getElementById("deleteModal");
    this.deleteMessage = document.getElementById("deleteMessage");
    this.deleteConfirm = document.getElementById("deleteConfirm");

    this.composer = new ComparisonComposer({
      api: this.api,
      getBeforeUrl: () => this.fields.beforeImage.value,
      getAfterUrl: () => this.fields.afterImage.value,
      getTitle: () => this.fields.title.value,
      getCategory: () => this.fields.category.value,
      setComparisonUrl: (url) => {
        this.fields.comparisonImage.value = url;
        this.updateWorkflowState();
      },
    });
  }

  setCategories(categories = []) {
    this.categoryOptions = [...new Set(
      categories.map((value) => String(value || "").trim()).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
    this.renderCategoryOptions(this.fields.category?.value || "");
  }

  renderCategoryOptions(selectedValue = "") {
    const options = [...new Set([...DEFAULT_CATEGORIES, ...this.categoryOptions])]
      .sort((a, b) => a.localeCompare(b));
    if (selectedValue && !options.includes(selectedValue)) options.unshift(selectedValue);

    this.fields.category.innerHTML = [
      '<option value="">Select a category</option>',
      ...options.map((value) => `<option value="${this.escape(value)}">${this.escape(value)}</option>`),
    ].join("");
    this.fields.category.value = selectedValue;
  }

  escape(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  ensureWorkflowStyles() {
    if (document.getElementById("galleryWorkflowStyles")) return;

    const style = document.createElement("style");
    style.id = "galleryWorkflowStyles";
    style.textContent = `
      .drawer-subtitle {
        display: block;
        max-width: 460px;
        margin-top: 6px;
        color: var(--muted);
        line-height: 1.4;
      }

      .workflow-progress {
        display: grid;
        grid-template-columns: 18px minmax(24px, 1fr) 18px minmax(24px, 1fr) 18px minmax(24px, 1fr) 18px;
        align-items: center;
        width: min(420px, 100%);
        margin: 0 auto 22px;
      }

      .progress-dot {
        width: 18px;
        height: 18px;
        border: 2px solid #cbd4dc;
        border-radius: 50%;
        background: #fff;
      }

      .progress-dot.is-complete {
        border-color: var(--success);
        background: var(--success);
        box-shadow: inset 0 0 0 4px #fff;
      }

      .progress-line {
        height: 2px;
        background: #dce3e8;
      }

      .workflow-stack {
        display: grid;
        gap: 12px;
      }

      .workflow-card {
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: #fff;
      }

      .workflow-card.is-open {
        border-color: rgba(25, 50, 74, 0.32);
        box-shadow: 0 12px 32px rgba(17, 34, 51, 0.08);
      }

      .workflow-card.is-complete {
        border-color: rgba(36, 115, 77, 0.28);
      }

      .workflow-card-toggle {
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr) 28px;
        align-items: center;
        gap: 12px;
        width: 100%;
        border: 0;
        padding: 15px 16px;
        background: #fff;
        color: var(--ink);
        text-align: left;
      }

      .workflow-card-toggle:hover {
        background: var(--soft);
      }

      .workflow-number {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--blue-soft);
        color: var(--navy);
        font-weight: 800;
      }

      .workflow-card.is-complete .workflow-number {
        background: #e9f7ef;
        color: var(--success);
      }

      .workflow-heading strong,
      .workflow-heading small {
        display: block;
      }

      .workflow-heading small {
        margin-top: 3px;
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 500;
      }

      .workflow-check {
        color: var(--muted);
        font-size: 1.2rem;
        font-weight: 900;
        text-align: center;
      }

      .workflow-card.is-complete .workflow-check {
        color: var(--success);
      }

      .workflow-card-body {
        display: none;
        padding: 0 16px 18px;
      }

      .workflow-card.is-open .workflow-card-body {
        display: grid;
        gap: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--line);
      }

      .workflow-next-row {
        display: flex;
        justify-content: flex-end;
      }

      .photo-card-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .drop-zone {
        display: grid;
        gap: 13px;
        padding: 14px;
        border: 2px dashed rgba(25, 50, 74, 0.18);
        border-radius: 16px;
        background: var(--soft);
        outline: none;
      }

      .drop-zone:focus,
      .drop-zone.is-dragging {
        border-color: var(--navy);
        background: var(--blue-soft);
      }

      .drop-zone .image-preview {
        max-width: none;
      }

      .upload-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
      }

      .drop-hint {
        color: var(--muted);
        line-height: 1.4;
      }

      .publishing-card {
        display: grid;
        gap: 16px;
        padding: 16px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: var(--soft);
      }

      .comparison-workflow {
        display: grid;
        gap: 14px;
      }

      .publish-readiness {
        border: 1px solid #ead59d;
        border-radius: 13px;
        padding: 12px 14px;
        background: #fff8e6;
        color: #765100;
        font-size: 0.86rem;
        font-weight: 700;
        line-height: 1.4;
      }

      .publish-readiness.is-ready {
        border-color: rgba(36, 115, 77, 0.24);
        background: #e9f7ef;
        color: var(--success);
      }

      @media (max-width: 760px) {
        .workflow-progress {
          width: 100%;
          margin-bottom: 16px;
        }

        .workflow-card-toggle {
          grid-template-columns: 34px minmax(0, 1fr) 24px;
          gap: 9px;
          padding: 14px 12px;
        }

        .workflow-card-body {
          padding-left: 12px;
          padding-right: 12px;
        }

        .workflow-next-row,
        .workflow-next-row .button,
        .upload-actions,
        .upload-actions .button {
          width: 100%;
        }

        .workflow-next-row .button,
        .upload-actions .button {
          display: flex;
          justify-content: center;
        }
      }
    `;

    document.head.appendChild(style);
  }

  bind() {
    this.ensureWorkflowStyles();
    document.getElementById("drawerClose")?.addEventListener("click", () => this.close());
    document.getElementById("drawerCancel")?.addEventListener("click", () => this.close());
    this.backdrop?.addEventListener("click", () => this.close());
    this.form?.addEventListener("submit", (event) => this.handleSubmit(event));
    this.deleteButton?.addEventListener("click", () => this.openDeleteModal());
    document.getElementById("deleteCancel")?.addEventListener("click", () => this.closeDeleteModal());
    this.deleteModal?.querySelector(".modal-backdrop")?.addEventListener("click", () => this.closeDeleteModal());
    this.deleteConfirm?.addEventListener("click", () => this.handleDelete());

    document.querySelectorAll("[data-step-toggle]").forEach((button) => {
      button.addEventListener("click", () => this.openStep(button.dataset.stepToggle));
    });

    document.querySelectorAll("[data-next-step]").forEach((button) => {
      button.addEventListener("click", () => this.handleNextStep(button.dataset.nextStep));
    });

    Object.entries(this.photoControls).forEach(([label, controls]) => {
      controls.inputs.forEach((input) => {
        input?.addEventListener("change", () => {
          const file = input.files?.[0];
          if (file) this.prepareAndUpload(file, label);
          input.value = "";
        });
      });

      ["dragenter", "dragover"].forEach((type) => {
        controls.dropZone?.addEventListener(type, (event) => {
          event.preventDefault();
          controls.dropZone.classList.add("is-dragging");
        });
      });

      ["dragleave", "drop"].forEach((type) => {
        controls.dropZone?.addEventListener(type, (event) => {
          event.preventDefault();
          controls.dropZone.classList.remove("is-dragging");
        });
      });

      controls.dropZone?.addEventListener("drop", (event) => {
        const file = event.dataTransfer?.files?.[0];
        if (file) this.prepareAndUpload(file, label);
      });

      controls.dropZone?.addEventListener("keydown", (event) => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        controls.inputs[0]?.click();
      });
    });

    this.fields.title?.addEventListener("input", () => this.updateWorkflowState());
    this.fields.category?.addEventListener("change", () => this.updateWorkflowState());
    this.fields.status?.addEventListener("change", () => {
      this.updateStatusHelp();
      this.updateWorkflowState();
    });

    this.composer.bind();

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!this.deleteModal?.hidden) this.closeDeleteModal();
      else if (!document.getElementById("cropModal")?.hidden) this.cropper.cancel();
      else if (this.drawer?.classList.contains("is-open")) this.close();
    });
  }

  open(record = null) {
    this.currentRecord = record ? normalizeRecord(record) : null;
    this.title.textContent = this.currentRecord ? "Edit transformation" : "Add transformation";
    this.deleteButton.hidden = !this.currentRecord;
    this.populate(this.currentRecord);

    this.scrollPosition = window.scrollY || 0;
    this.drawer.classList.add("is-open");
    this.drawer.setAttribute("aria-hidden", "false");
    this.backdrop.hidden = false;
    document.body.style.top = `-${this.scrollPosition}px`;
    document.body.classList.add("drawer-open");

    this.updateWorkflowState();
    this.openStep(this.getNextIncompleteStep());

    if (!this.currentRecord) {
      window.setTimeout(() => this.fields.title?.focus({ preventScroll: true }), 80);
    }
  }

  close() {
    this.drawer.classList.remove("is-open");
    this.drawer.setAttribute("aria-hidden", "true");
    this.backdrop.hidden = true;
    document.body.classList.remove("drawer-open");
    document.body.style.top = "";
    window.scrollTo(0, this.scrollPosition);
    this.form.reset();
    this.currentRecord = null;
    this.pendingDeleteId = "";
  }

  populate(record) {
    const value = record || {};
    this.fields.id.value = value.id || "";
    this.fields.title.value = value.title || "";
    this.renderCategoryOptions(value.category || "");
    this.fields.beforeImage.value = value.beforeImage || "";
    this.fields.afterImage.value = value.afterImage || "";
    this.fields.comparisonImage.value = value.comparisonImage || "";
    this.fields.status.value = value.published ? "published" : "draft";
    this.fields.featured.checked = Boolean(value.featured);

    this.renderPreview("before", value.beforeImage);
    this.renderPreview("after", value.afterImage);
    this.photoControls.before.status.textContent = value.beforeImage ? "Before photo saved" : "No photo selected";
    this.photoControls.after.status.textContent = value.afterImage ? "After photo saved" : "Not added yet";
    this.composer.reset(value.comparisonImage || "");
    this.updateStatusHelp();
    this.updateWorkflowState();
  }

  openStep(step) {
    if (!WORKFLOW_STEPS.includes(step)) return;

    this.workflowCards.forEach((card, cardStep) => {
      if (!card) return;
      const isOpen = cardStep === step;
      card.classList.toggle("is-open", isOpen);
      card.querySelector(".workflow-card-toggle")?.setAttribute("aria-expanded", String(isOpen));
    });

    const activeCard = this.workflowCards.get(step);
    activeCard?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  handleNextStep(nextStep) {
    const state = this.getCompletionState();

    if (nextStep === "before" && !state.details) {
      toast("Add a title and category before continuing.", "error");
      this.openStep("details");
      return;
    }

    if (nextStep === "after" && !state.before) {
      toast("Add the Before photo before continuing.", "error");
      this.openStep("before");
      return;
    }

    this.openStep(nextStep);
  }

  getCompletionState() {
    const details = Boolean(
      this.fields.title.value.trim() &&
      this.fields.category.value.trim()
    );
    const before = Boolean(this.fields.beforeImage.value.trim());
    const after = Boolean(this.fields.afterImage.value.trim());
    const comparison = Boolean(this.fields.comparisonImage.value.trim());
    const publishing = before && after && comparison;

    return {
      details,
      before,
      after,
      comparison,
      publishing,
    };
  }

  getNextIncompleteStep() {
    const state = this.getCompletionState();

    if (!state.details) return "details";
    if (!state.before) return "before";
    if (!state.after) return "after";
    return "publishing";
  }

  updateWorkflowState() {
    const state = this.getCompletionState();
    const completion = {
      details: state.details,
      before: state.before,
      after: state.after,
      publishing: state.publishing,
    };

    WORKFLOW_STEPS.forEach((step) => {
      const complete = completion[step];
      const card = this.workflowCards.get(step);
      const dot = this.progressDots.get(step);
      const check = this.stepChecks.get(step);

      card?.classList.toggle("is-complete", complete);
      dot?.classList.toggle("is-complete", complete);

      if (check) {
        check.textContent = complete ? "✓" : "○";
        check.setAttribute("aria-label", complete ? "Complete" : "Incomplete");
      }
    });

    if (!this.publishReadiness) return;

    const missing = [];
    if (!state.before) missing.push("Before photo");
    if (!state.after) missing.push("After photo");
    if (!state.comparison) missing.push("saved combined photo");

    if (!missing.length) {
      this.publishReadiness.classList.add("is-ready");
      this.publishReadiness.textContent = "Ready to publish. Every required photo is saved.";
      return;
    }

    this.publishReadiness.classList.remove("is-ready");
    this.publishReadiness.textContent =
      `Draft ready. To publish, add ${this.formatList(missing)}.`;
  }

  formatList(items) {
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
  }

  updateStatusHelp() {
    const help = document.getElementById("statusHelp");
    if (!help) return;

    const publishing = this.fields.status.value === "published";
    help.textContent = publishing
      ? "Publishing requires Before, After, and the saved combined photo."
      : "Drafts may contain only the Before photo.";
  }

  getPayload() {
    return {
      title: this.fields.title.value.trim(),
      category: this.fields.category.value.trim(),
      beforeImage: this.fields.beforeImage.value.trim(),
      afterImage: this.fields.afterImage.value.trim(),
      comparisonImage: this.fields.comparisonImage.value.trim(),
      published: this.fields.status.value === "published",
      featured: this.fields.featured.checked,
    };
  }

  buildDriveFileName(label, extension = "jpg") {
    const title = this.fields.title.value.trim() || "Untitled";
    const category = this.fields.category.value.trim() || "Uncategorized";
    const suffix = label === "before" ? "Before" : label === "after" ? "After" : "Comparison";
    return `${title}-${category}-${suffix}.${extension}`;
  }

  async prepareAndUpload(file, label) {
    const controls = this.photoControls[label];
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file.", "error");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast("The original photo must be 15 MB or smaller.", "error");
      return;
    }

    try {
      const cropped = await this.cropper.open(file, label === "before" ? "Before" : "After");
      controls.status.textContent = "Uploading cropped photo…";
      this.setPhotoInputsDisabled(label, true);

      const response = await this.api.uploadImage({
        fileName: this.buildDriveFileName(label, cropped.extension),
        mimeType: cropped.mimeType,
        dataUrl: cropped.dataUrl,
      });

      const url = response.data?.url || "";
      if (!url) throw new Error("The upload completed without returning an image URL.");

      controls.urlField.value = url;
      controls.status.textContent = `${label === "before" ? "Before" : "After"} photo saved`;
      this.renderPreview(label, url);
      this.composer.reset(this.fields.comparisonImage.value);
      this.updateWorkflowState();

      if (label === "before") {
        this.openStep("after");
      } else {
        this.openStep("publishing");
      }

      toast(`${label === "before" ? "Before" : "After"} photo uploaded.`);
    } catch (error) {
      if (error.message !== "Crop cancelled.") {
        controls.status.textContent = "Upload failed";
        toast(error.message, "error", 6000);
      }
    } finally {
      this.setPhotoInputsDisabled(label, false);
    }
  }

  setPhotoInputsDisabled(label, disabled) {
    this.photoControls[label].inputs.forEach((input) => {
      if (input) input.disabled = disabled;
    });
  }

  renderPreview(label, url) {
    const preview = this.photoControls[label].preview;
    if (!preview) return;

    if (!url) {
      preview.innerHTML = `<div class="preview-empty">${label === "before" ? "Drop a photo here or choose an option below" : "Return later to add the finished result"}</div>`;
      return;
    }

    preview.innerHTML = `<img src="${getPreviewUrl(url, 1000)}" alt="${label} transformation photo">`;
  }

  validatePublish(payload) {
    if (!payload.published) return true;
    if (!payload.beforeImage || !payload.afterImage || !payload.comparisonImage) {
      toast("To publish, add the Before photo, After photo, and save the combined photo.", "error", 6500);
      this.openStep("publishing");
      return false;
    }
    return true;
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (!this.fields.title.value.trim() || !this.fields.category.value.trim()) {
      this.openStep("details");
      this.form.reportValidity();
      return;
    }

    if (!this.fields.beforeImage.value.trim()) {
      toast("Add a Before photo before saving the transformation.", "error");
      this.openStep("before");
      return;
    }

    if (!this.form.reportValidity()) return;

    const payload = this.getPayload();
    if (!this.validatePublish(payload)) return;

    loading(this.saveButton, true, "Saving…");
    try {
      const recordId = this.fields.id.value.trim();
      const response = recordId
        ? await this.api.update(recordId, payload)
        : await this.api.create(payload);

      toast(response.message || "Transformation saved.");
      this.close();
      await this.onSaved(response.data);
    } catch (error) {
      toast(error.message, "error", 6000);
    } finally {
      loading(this.saveButton, false);
    }
  }

  openDeleteModal() {
    const recordId = this.fields.id.value.trim();
    if (!recordId) {
      toast("This transformation does not have a record ID yet.", "error");
      return;
    }

    this.pendingDeleteId = recordId;
    const title = this.fields.title.value.trim() || "this transformation";
    this.deleteMessage.textContent =
      `Delete “${title}”? This removes the gallery record and cannot be undone. Drive images will not be deleted.`;
    this.deleteModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  closeDeleteModal() {
    this.deleteModal.hidden = true;
    this.pendingDeleteId = "";
    document.body.classList.remove("modal-open");
  }

  async handleDelete() {
    const recordId = this.pendingDeleteId || this.fields.id.value.trim();
    if (!recordId) {
      toast("A gallery record ID is required.", "error");
      this.closeDeleteModal();
      return;
    }

    loading(this.deleteConfirm, true, "Deleting…");
    try {
      const response = await this.api.delete(recordId);
      toast(response.message || "Transformation deleted.");
      this.closeDeleteModal();
      this.close();
      await this.onDeleted(recordId);
    } catch (error) {
      toast(error.message, "error", 6000);
    } finally {
      loading(this.deleteConfirm, false);
    }
  }
}
