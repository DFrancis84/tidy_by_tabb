"use strict";

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
|
| Paste the Google Apps Script /exec URL here.
|
| Example:
| https://script.google.com/macros/s/ABC123/exec
|
*/

const API_URL = "https://script.google.com/macros/s/AKfycbyLkwoj-c2DqYWpLNaYOgsZi9_FqgvMQm-7a2Zis8TA5zpRDKY6TK4RXtistJV873gw/exec";

/*
|--------------------------------------------------------------------------
| Application state
|--------------------------------------------------------------------------
*/

const state = {
  records: [],
  currentRecordId: "",
  activeView: "dashboard",
  loading: false
};

/*
|--------------------------------------------------------------------------
| DOM references
|--------------------------------------------------------------------------
*/

const elements = {
  sidebar: document.getElementById("sidebar"),
  menu: document.getElementById("menu"),
  title: document.getElementById("title"),

  navButtons: document.querySelectorAll(".nav"),
  views: document.querySelectorAll(".view"),
  goButtons: document.querySelectorAll("[data-go]"),

  statTotal: document.getElementById("statTotal"),
  statPublished: document.getElementById("statPublished"),
  statDrafts: document.getElementById("statDrafts"),
  statFeatured: document.getElementById("statFeatured"),

  addTransformation: document.getElementById("addTransformation"),
  galleryGrid: document.getElementById("galleryGrid"),
  galleryEmpty: document.getElementById("galleryEmpty"),
  gallerySearch: document.getElementById("gallerySearch"),
  galleryCategory: document.getElementById("galleryCategory"),
  galleryStatus: document.getElementById("galleryStatus"),

  overlay: document.getElementById("overlay"),
  drawer: document.getElementById("drawer"),
  drawerTitle: document.getElementById("drawerTitle"),
  closeDrawer: document.getElementById("closeDrawer"),

  galleryForm: document.getElementById("galleryForm"),
  recordId: document.getElementById("recordId"),
  recordTitle: document.getElementById("recordTitle"),
  recordCategory: document.getElementById("recordCategory"),
  beforeImage: document.getElementById("beforeImage"),
  afterImage: document.getElementById("afterImage"),
  comparisonImage: document.getElementById("comparisonImage"),
  beforePreview: document.getElementById("beforePreview"),
  afterPreview: document.getElementById("afterPreview"),
  recordStatus: document.getElementById("recordStatus"),
  recordFeatured: document.getElementById("recordFeatured"),

  deleteRecord: document.getElementById("deleteRecord"),
  cancelEdit: document.getElementById("cancelEdit"),

  toast: document.getElementById("toast")
};

/*
|--------------------------------------------------------------------------
| API client
|--------------------------------------------------------------------------
*/

async function apiRequest(options = {}) {
  const {
    method = "GET",
    action = "",
    params = {},
    body = null
  } = options;

  validateApiUrl();

  const url = new URL(API_URL);

  if (action) {
    url.searchParams.set("action", action);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      url.searchParams.set(key, String(value));
    }
  });

  const fetchOptions = {
    method,
    redirect: "follow"
  };

  if (body !== null) {
    /*
     * text/plain prevents the browser from sending a CORS preflight
     * request to Google Apps Script.
     */
    fetchOptions.headers = {
      "Content-Type": "text/plain;charset=utf-8"
    };

    fetchOptions.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(url.toString(), fetchOptions);
  } catch (error) {
    throw new Error(
      "Unable to reach the gallery API. Check your connection and API URL."
    );
  }

  let payload;

  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(
      "The gallery API returned an invalid response."
    );
  }

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.message || "The gallery request failed."
    );
  }

  return payload.data;
}

function validateApiUrl() {
  if (
    !API_URL ||
    API_URL.includes("PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE")
  ) {
    throw new Error(
      "Add your Google Apps Script /exec URL to API_URL in script.js."
    );
  }

  if (!API_URL.endsWith("/exec")) {
    console.warn(
      "The configured API URL does not end in /exec. Confirm that you are using the deployed web-app URL."
    );
  }
}

async function fetchGalleryRecords() {
  return apiRequest({
    action: "list",
    params: {
      published: "all"
    }
  });
}

async function createGalleryRecord(record) {
  return apiRequest({
    method: "POST",
    body: {
      action: "create",
      record
    }
  });
}

async function updateGalleryRecord(id, record) {
  return apiRequest({
    method: "POST",
    body: {
      action: "update",
      id,
      record: {
        ...record,
        id
      }
    }
  });
}

async function deleteGalleryRecord(id) {
  return apiRequest({
    method: "POST",
    body: {
      action: "delete",
      id
    }
  });
}

/*
|--------------------------------------------------------------------------
| Startup
|--------------------------------------------------------------------------
*/

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
  bindEvents();
  updatePreviews();

  try {
    await loadGallery();
  } catch (error) {
    showToast(error.message, "error");
    renderGallery();
    updateDashboardStats();
  }
}

function bindEvents() {
  elements.navButtons.forEach(button => {
    button.addEventListener("click", () => {
      switchView(button.dataset.view);
    });
  });

  elements.goButtons.forEach(button => {
    button.addEventListener("click", () => {
      switchView(button.dataset.go);
    });
  });

  elements.menu.addEventListener("click", () => {
    elements.sidebar.classList.toggle("open");
  });

  elements.addTransformation.addEventListener(
    "click",
    openCreateDrawer
  );

  elements.closeDrawer.addEventListener(
    "click",
    closeDrawer
  );

  elements.cancelEdit.addEventListener(
    "click",
    closeDrawer
  );

  elements.overlay.addEventListener(
    "click",
    closeDrawer
  );

  elements.galleryForm.addEventListener(
    "submit",
    handleFormSubmit
  );

  elements.deleteRecord.addEventListener(
    "click",
    handleDelete
  );

  elements.gallerySearch.addEventListener(
    "input",
    renderGallery
  );

  elements.galleryCategory.addEventListener(
    "change",
    renderGallery
  );

  elements.galleryStatus.addEventListener(
    "change",
    renderGallery
  );

  elements.beforeImage.addEventListener(
    "input",
    updatePreviews
  );

  elements.afterImage.addEventListener(
    "input",
    updatePreviews
  );

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeDrawer();
    }
  });
}

/*
|--------------------------------------------------------------------------
| Data loading
|--------------------------------------------------------------------------
*/

async function loadGallery() {
  setLoading(true);

  try {
    const records = await fetchGalleryRecords();

    state.records = Array.isArray(records)
      ? records.map(normalizeRecord)
      : [];

    renderGallery();
    updateDashboardStats();
  } finally {
    setLoading(false);
  }
}

function normalizeRecord(record) {
  return {
    id: cleanString(record.id),
    title: cleanString(record.title),
    category: cleanString(record.category),
    beforeImage: cleanString(record.beforeImage),
    afterImage: cleanString(record.afterImage),
    comparisonImage: cleanString(record.comparisonImage),
    featured: toBoolean(record.featured),
    published: toBoolean(record.published),
    created: cleanString(record.created),
    updated: cleanString(record.updated)
  };
}

/*
|--------------------------------------------------------------------------
| View navigation
|--------------------------------------------------------------------------
*/

function switchView(viewName) {
  const targetView = document.getElementById(viewName);

  if (!targetView) {
    return;
  }

  state.activeView = viewName;

  elements.views.forEach(view => {
    view.classList.toggle(
      "active",
      view.id === viewName
    );
  });

  elements.navButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.view === viewName
    );
  });

  elements.title.textContent = getViewTitle(viewName);
  elements.sidebar.classList.remove("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function getViewTitle(viewName) {
  const titles = {
    dashboard: "Dashboard",
    gallery: "Gallery",
    reviews: "Reviews",
    media: "Media Pipeline",
    settings: "Settings"
  };

  return titles[viewName] || "Dashboard";
}

/*
|--------------------------------------------------------------------------
| Gallery rendering
|--------------------------------------------------------------------------
*/

function renderGallery() {
  const filteredRecords = getFilteredRecords();

  elements.galleryGrid.innerHTML = "";

  elements.galleryEmpty.classList.toggle(
    "hidden",
    filteredRecords.length > 0
  );

  filteredRecords.forEach(record => {
    elements.galleryGrid.appendChild(
      createGalleryCard(record)
    );
  });
}

function getFilteredRecords() {
  const search = cleanString(
    elements.gallerySearch.value
  ).toLowerCase();

  const category = cleanString(
    elements.galleryCategory.value
  ).toLowerCase();

  const status = cleanString(
    elements.galleryStatus.value
  ).toLowerCase();

  return [...state.records]
    .filter(record => {
      const searchableText = [
        record.title,
        record.category
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search || searchableText.includes(search);

      const matchesCategory =
        !category ||
        record.category.toLowerCase() === category;

      const recordStatus = record.published
        ? "published"
        : "draft";

      const matchesStatus =
        !status || recordStatus === status;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    })
    .sort(sortRecordsNewestFirst);
}

function createGalleryCard(record) {
  const article = document.createElement("article");
  article.className = "gallery-card";
  article.dataset.id = record.id;

  const mainImage =
    record.comparisonImage ||
    record.afterImage ||
    record.beforeImage;

  const statusLabel = record.published
    ? "Published"
    : "Draft";

  const statusClass = record.published
    ? "published"
    : "draft";

  article.innerHTML = `
    <button
      type="button"
      class="gallery-card-button"
      aria-label="Edit ${escapeHtml(record.title)}"
    >
      <div class="gallery-card-image">
        ${imageMarkup(mainImage, record.title)}
        <div class="gallery-card-badges">
          <span class="status-badge ${statusClass}">
            ${statusLabel}
          </span>

          ${
            record.featured
              ? '<span class="featured-badge">★ Featured</span>'
              : ""
          }
        </div>
      </div>

      <div class="gallery-card-body">
        <small>${escapeHtml(record.category)}</small>
        <h3>${escapeHtml(record.title)}</h3>
        <p>${formatUpdatedDate(record.updated || record.created)}</p>
      </div>
    </button>
  `;

  article
    .querySelector(".gallery-card-button")
    .addEventListener("click", () => {
      openEditDrawer(record.id);
    });

  return article;
}

function imageMarkup(url, altText) {
  const normalizedUrl = normalizeImageUrl(url);

  if (!normalizedUrl) {
    return `
      <div class="gallery-image-placeholder">
        <span>🖼️</span>
        <small>No image</small>
      </div>
    `;
  }

  return `
    <img
      src="${escapeAttribute(normalizedUrl)}"
      alt="${escapeAttribute(altText)}"
      loading="lazy"
      onerror="
        this.style.display='none';
        this.nextElementSibling.style.display='flex';
      "
    >
    <div
      class="gallery-image-placeholder"
      style="display:none"
    >
      <span>⚠️</span>
      <small>Image unavailable</small>
    </div>
  `;
}

/*
|--------------------------------------------------------------------------
| Dashboard statistics
|--------------------------------------------------------------------------
*/

function updateDashboardStats() {
  const total = state.records.length;

  const published = state.records.filter(
    record => record.published
  ).length;

  const drafts = total - published;

  const featuredRecord = state.records.find(
    record => record.featured
  );

  elements.statTotal.textContent = String(total);
  elements.statPublished.textContent = String(published);
  elements.statDrafts.textContent = String(drafts);

  elements.statFeatured.textContent = featuredRecord
    ? featuredRecord.title
    : "None";
}

/*
|--------------------------------------------------------------------------
| Drawer
|--------------------------------------------------------------------------
*/

function openCreateDrawer() {
  resetForm();

  state.currentRecordId = "";

  elements.drawerTitle.textContent =
    "Add transformation";

  elements.deleteRecord.classList.add("hidden");

  openDrawer();
}

function openEditDrawer(id) {
  const record = state.records.find(
    item => item.id === id
  );

  if (!record) {
    showToast(
      "That gallery record could not be found.",
      "error"
    );
    return;
  }

  state.currentRecordId = record.id;

  elements.recordId.value = record.id;
  elements.recordTitle.value = record.title;
  elements.recordCategory.value = record.category;
  elements.beforeImage.value = record.beforeImage;
  elements.afterImage.value = record.afterImage;
  elements.comparisonImage.value =
    record.comparisonImage;

  elements.recordStatus.value = record.published
    ? "published"
    : "draft";

  elements.recordFeatured.checked = record.featured;

  elements.drawerTitle.textContent =
    "Edit transformation";

  elements.deleteRecord.classList.remove("hidden");

  updatePreviews();
  openDrawer();
}

function openDrawer() {
  elements.drawer.classList.add("open");
  elements.overlay.classList.add("active");
  elements.drawer.setAttribute("aria-hidden", "false");

  document.body.classList.add("drawer-open");

  window.setTimeout(() => {
    elements.recordTitle.focus();
  }, 150);
}

function closeDrawer() {
  if (state.loading) {
    return;
  }

  elements.drawer.classList.remove("open");
  elements.overlay.classList.remove("active");
  elements.drawer.setAttribute("aria-hidden", "true");

  document.body.classList.remove("drawer-open");
}

function resetForm() {
  elements.galleryForm.reset();

  elements.recordId.value = "";
  elements.recordStatus.value = "draft";
  elements.recordFeatured.checked = false;

  state.currentRecordId = "";

  updatePreviews();
}

/*
|--------------------------------------------------------------------------
| Create and update
|--------------------------------------------------------------------------
*/

async function handleFormSubmit(event) {
  event.preventDefault();

  if (state.loading) {
    return;
  }

  const record = collectFormRecord();

  try {
    validateRecord(record);
  } catch (error) {
    showToast(error.message, "error");
    return;
  }

  setLoading(true);

  try {
    /*
     * Keep only one featured transformation.
     *
     * If the submitted record is featured, any previously featured
     * record is updated first.
     */
    if (record.featured) {
      await clearExistingFeaturedRecord(
        state.currentRecordId
      );
    }

    let savedRecord;

    if (state.currentRecordId) {
      savedRecord = await updateGalleryRecord(
        state.currentRecordId,
        record
      );

      replaceRecordInState(savedRecord);

      showToast(
        "Transformation updated.",
        "success"
      );
    } else {
      savedRecord = await createGalleryRecord(record);

      state.records.unshift(
        normalizeRecord(savedRecord)
      );

      showToast(
        "Transformation created.",
        "success"
      );
    }

    renderGallery();
    updateDashboardStats();
    closeDrawerAfterRequest();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setLoading(false);
  }
}

function collectFormRecord() {
  return {
    title: cleanString(elements.recordTitle.value),
    category: cleanString(
      elements.recordCategory.value
    ),
    beforeImage: cleanString(
      elements.beforeImage.value
    ),
    afterImage: cleanString(
      elements.afterImage.value
    ),
    comparisonImage: cleanString(
      elements.comparisonImage.value
    ),
    featured: elements.recordFeatured.checked,
    published:
      elements.recordStatus.value === "published"
  };
}

function validateRecord(record) {
  if (!record.title) {
    throw new Error(
      "Enter a title for the transformation."
    );
  }

  if (!record.category) {
    throw new Error(
      "Choose a category."
    );
  }

  if (
    !record.beforeImage &&
    !record.afterImage &&
    !record.comparisonImage
  ) {
    throw new Error(
      "Add at least one image URL."
    );
  }
}

async function clearExistingFeaturedRecord(
  currentRecordId
) {
  const existingFeatured = state.records.find(
    record =>
      record.featured &&
      record.id !== currentRecordId
  );

  if (!existingFeatured) {
    return;
  }

  const updatedRecord = await updateGalleryRecord(
    existingFeatured.id,
    {
      title: existingFeatured.title,
      category: existingFeatured.category,
      beforeImage: existingFeatured.beforeImage,
      afterImage: existingFeatured.afterImage,
      comparisonImage:
        existingFeatured.comparisonImage,
      featured: false,
      published: existingFeatured.published
    }
  );

  replaceRecordInState(updatedRecord);
}

function replaceRecordInState(record) {
  const normalized = normalizeRecord(record);

  const index = state.records.findIndex(
    item => item.id === normalized.id
  );

  if (index === -1) {
    state.records.unshift(normalized);
    return;
  }

  state.records[index] = normalized;
}

function closeDrawerAfterRequest() {
  elements.drawer.classList.remove("open");
  elements.overlay.classList.remove("active");
  elements.drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
}

/*
|--------------------------------------------------------------------------
| Delete
|--------------------------------------------------------------------------
*/

async function handleDelete() {
  const id = state.currentRecordId;

  if (!id || state.loading) {
    return;
  }

  const record = state.records.find(
    item => item.id === id
  );

  const confirmed = window.confirm(
    `Delete "${record?.title || "this transformation"}"? This cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  setLoading(true);

  try {
    await deleteGalleryRecord(id);

    state.records = state.records.filter(
      item => item.id !== id
    );

    renderGallery();
    updateDashboardStats();
    closeDrawerAfterRequest();

    showToast(
      "Transformation deleted.",
      "success"
    );
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setLoading(false);
  }
}

/*
|--------------------------------------------------------------------------
| Image previews and Google Drive links
|--------------------------------------------------------------------------
*/

function updatePreviews() {
  renderImagePreview(
    elements.beforePreview,
    elements.beforeImage.value,
    "Before preview"
  );

  renderImagePreview(
    elements.afterPreview,
    elements.afterImage.value,
    "After preview"
  );
}

function renderImagePreview(container, url, altText) {
  const normalizedUrl = normalizeImageUrl(url);

  if (!normalizedUrl) {
    container.innerHTML = "No image";
    return;
  }

  container.innerHTML = `
    <img
      src="${escapeAttribute(normalizedUrl)}"
      alt="${escapeAttribute(altText)}"
    >
  `;

  const image = container.querySelector("img");

  image.addEventListener("error", () => {
    container.innerHTML = "Unable to load image";
  });
}

/**
 * Converts common Google Drive sharing links into image URLs.
 *
 * Supported:
 * https://drive.google.com/file/d/FILE_ID/view
 * https://drive.google.com/open?id=FILE_ID
 * https://drive.google.com/uc?id=FILE_ID
 * Existing thumbnail URLs
 */
function normalizeImageUrl(value) {
  const url = cleanString(value);

  if (!url) {
    return "";
  }

  const driveFileId = extractGoogleDriveFileId(url);

  if (driveFileId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(
      driveFileId
    )}&sz=w1600`;
  }

  return url;
}

function extractGoogleDriveFileId(url) {
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/uc\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/thumbnail\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/i,
    /[?&]id=([a-zA-Z0-9_-]+)/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);

    if (match && match[1]) {
      return match[1];
    }
  }

  return "";
}

/*
|--------------------------------------------------------------------------
| Loading state
|--------------------------------------------------------------------------
*/

function setLoading(isLoading) {
  state.loading = isLoading;

  const submitButton =
    elements.galleryForm.querySelector(
      'button[type="submit"]'
    );

  const controls = [
    submitButton,
    elements.deleteRecord,
    elements.cancelEdit,
    elements.addTransformation
  ];

  controls.forEach(control => {
    if (control) {
      control.disabled = isLoading;
    }
  });

  if (submitButton) {
    submitButton.textContent = isLoading
      ? "Saving..."
      : "Save transformation";
  }

  elements.galleryGrid.classList.toggle(
    "loading",
    isLoading
  );
}

/*
|--------------------------------------------------------------------------
| Toasts
|--------------------------------------------------------------------------
*/

let toastTimer = null;

function showToast(message, type = "success") {
  if (!elements.toast) {
    return;
  }

  window.clearTimeout(toastTimer);

  elements.toast.textContent = message;
  elements.toast.className = `toast show ${type}`;

  toastTimer = window.setTimeout(() => {
    elements.toast.className = "toast";
  }, 3500);
}

/*
|--------------------------------------------------------------------------
| Utilities
|--------------------------------------------------------------------------
*/

function cleanString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return ["true", "1", "yes", "on"].includes(
    cleanString(value).toLowerCase()
  );
}

function sortRecordsNewestFirst(a, b) {
  const dateA = new Date(
    a.updated || a.created || 0
  ).getTime();

  const dateB = new Date(
    b.updated || b.created || 0
  ).getTime();

  return dateB - dateA;
}

function formatUpdatedDate(value) {
  if (!value) {
    return "Recently updated";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return `Updated ${new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  ).format(date)}`;
}

function escapeHtml(value) {
  return cleanString(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
