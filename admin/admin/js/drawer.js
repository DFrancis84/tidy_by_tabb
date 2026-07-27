import {
  getPreviewUrl,
  normalizeRecord,
  readFileAsDataUrl,
} from "./utils.js";
import { setButtonLoading, showToast } from "./ui.js";
import { ComparisonComposer } from "./composer.js";

export class GalleryDrawer {
  constructor({ api, onSaved, onDeleted } = {}) {
    this.api = api;
    this.onSaved = typeof onSaved === "function" ? onSaved : () => {};
    this.onDeleted = typeof onDeleted === "function" ? onDeleted : () => {};
    this.currentRecord = null;

    this.drawer = document.getElementById("galleryDrawer");
    this.backdrop = document.getElementById("drawerBackdrop");
    this.form = document.getElementById("galleryForm");
    this.title = document.getElementById("drawerTitle");
    this.saveButton = document.getElementById("saveRecord");
    this.deleteButton = document.getElementById("deleteRecord");

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

    this.beforeFile = document.getElementById("beforeFile");
    this.afterFile = document.getElementById("afterFile");
    this.beforeStatus = document.getElementById("beforeUploadStatus");
    this.afterStatus = document.getElementById("afterUploadStatus");

    this.beforePreview = document.getElementById("beforePreview");
    this.afterPreview = document.getElementById("afterPreview");

    this.composer = new ComparisonComposer({
      api: this.api,
      getBeforeUrl: () => this.fields.beforeImage.value,
      getAfterUrl: () => this.fields.afterImage.value,
      setComparisonUrl: (url) => {
        this.fields.comparisonImage.value = url;
      },
    });
  }

  bind() {
    document.getElementById("drawerClose")?.addEventListener("click", () => this.close());
    document.getElementById("drawerCancel")?.addEventListener("click", () => this.close());
    this.backdrop?.addEventListener("click", () => this.close());

    this.form?.addEventListener("submit", (event) => this.handleSubmit(event));
    this.deleteButton?.addEventListener("click", () => this.handleDelete());

    this.fields.beforeImage?.addEventListener("input", () => {
      this.renderPreview(this.beforePreview, this.fields.beforeImage.value, "before");
    });

    this.fields.afterImage?.addEventListener("input", () => {
      this.renderPreview(this.afterPreview, this.fields.afterImage.value, "after");
    });

    this.beforeFile?.addEventListener("change", () => {
      this.handleFileUpload(
        this.beforeFile,
        this.fields.beforeImage,
        this.beforePreview,
        this.beforeStatus,
        "before"
      );
    });

    this.afterFile?.addEventListener("change", () => {
      this.handleFileUpload(
        this.afterFile,
        this.fields.afterImage,
        this.afterPreview,
        this.afterStatus,
        "after"
      );
    });

    this.composer.bind();

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.drawer?.classList.contains("is-open")) {
        this.close();
      }
    });
  }

  open(record = null) {
    this.currentRecord = record ? normalizeRecord(record) : null;

    if (this.title) {
      this.title.textContent = this.currentRecord
        ? "Edit transformation"
        : "Add transformation";
    }

    if (this.deleteButton) {
      this.deleteButton.hidden = !this.currentRecord;
    }

    this.populate(this.currentRecord);

    this.drawer?.classList.add("is-open");
    this.drawer?.setAttribute("aria-hidden", "false");
    if (this.backdrop) this.backdrop.hidden = false;
    document.body.classList.add("drawer-open");

    window.setTimeout(() => this.fields.title?.focus(), 50);
  }

  close() {
    this.drawer?.classList.remove("is-open");
    this.drawer?.setAttribute("aria-hidden", "true");
    if (this.backdrop) this.backdrop.hidden = true;
    document.body.classList.remove("drawer-open");
    this.form?.reset();
    this.currentRecord = null;
  }

  populate(record) {
    const value = record || {
      id: "",
      title: "",
      category: "",
      beforeImage: "",
      afterImage: "",
      comparisonImage: "",
      published: false,
      featured: false,
    };

    this.fields.id.value = value.id || "";
    this.fields.title.value = value.title || "";
    this.fields.category.value = value.category || "";
    this.fields.beforeImage.value = value.beforeImage || "";
    this.fields.afterImage.value = value.afterImage || "";
    this.fields.comparisonImage.value = value.comparisonImage || "";
    this.fields.status.value = value.published ? "published" : "draft";
    this.fields.featured.checked = Boolean(value.featured);

    if (this.beforeStatus) this.beforeStatus.textContent = "Choose or replace photo";
    if (this.afterStatus) this.afterStatus.textContent = "Choose or replace photo";

    this.renderPreview(this.beforePreview, value.beforeImage, "before");
    this.renderPreview(this.afterPreview, value.afterImage, "after");
    this.composer.reset(value.comparisonImage);
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

  async handleFileUpload(fileInput, urlInput, preview, status, label) {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("Image must be 10 MB or smaller.", "error");
      fileInput.value = "";
      return;
    }

    status.textContent = "Uploading…";
    fileInput.disabled = true;

    try {
      const dataUrl = await readFileAsDataUrl(file);

      const response = await this.api.uploadImage({
        fileName: `${label}-${Date.now()}-${file.name}`,
        mimeType: file.type,
        dataUrl,
      });

      urlInput.value = response.data.url;
      this.renderPreview(preview, response.data.url, label);
      status.textContent = "Uploaded to Google Drive";

      showToast(`${label === "before" ? "Before" : "After"} photo uploaded.`);
    } catch (error) {
      status.textContent = "Upload failed";
      showToast(error.message, "error", 6000);
    } finally {
      fileInput.disabled = false;
      fileInput.value = "";
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (!this.form?.reportValidity()) return;

    const payload = this.getPayload();
    setButtonLoading(this.saveButton, true);

    try {
      const response = this.currentRecord
        ? await this.api.update(this.currentRecord.id, payload)
        : await this.api.create(payload);

      showToast(response.message || "Transformation saved.");
      this.close();
      await this.onSaved(response.data);
    } catch (error) {
      showToast(error.message, "error", 5200);
    } finally {
      setButtonLoading(this.saveButton, false);
    }
  }

  async handleDelete() {
    if (!this.currentRecord) return;

    const confirmed = window.confirm(
      `Delete "${this.currentRecord.title || "this transformation"}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setButtonLoading(this.deleteButton, true, "Deleting…");

    try {
      const response = await this.api.delete(this.currentRecord.id);
      showToast(response.message || "Transformation deleted.");
      this.close();
      await this.onDeleted(this.currentRecord.id);
    } catch (error) {
      showToast(error.message, "error", 5200);
    } finally {
      setButtonLoading(this.deleteButton, false);
    }
  }

  renderPreview(container, imageUrl, label) {
    if (!container) return;

    const previewUrl = getPreviewUrl(imageUrl, 700);

    if (!previewUrl) {
      container.innerHTML = `<div class="preview-empty">No ${label} image selected</div>`;
      return;
    }

    container.innerHTML = `
      <img src="${previewUrl}" alt="${label} image preview">
    `;
  }
}
