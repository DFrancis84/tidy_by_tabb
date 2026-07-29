const CONFIG = Object.freeze({
  APP_NAME: "Tidy by Tabb CMS",
  API_VERSION: "2.1.0",

  SPREADSHEET_ID: "1QaUKz6Jg2Tdf_qH9kGzG0XqjRf7fMtLqB8-Rxd1E5H0",

  GALLERY_SHEET_NAME: "Gallery",

  /*
   * Optional: paste a Drive folder ID here.
   * Leave blank to automatically create/use:
   * "Tidy by Tabb CMS Uploads"
   */
  DRIVE_UPLOAD_FOLDER_ID: "",
  DRIVE_UPLOAD_FOLDER_NAME: "Tidy by Tabb CMS Uploads",

  MAX_UPLOAD_BYTES: 10 * 1024 * 1024,

  ALLOWED_IMAGE_TYPES: Object.freeze([
    "image/jpeg",
    "image/png",
    "image/webp"
  ]),

  GALLERY_HEADERS: Object.freeze([
    "id",
    "title",
    "category",
    "beforeImage",
    "afterImage",
    "comparisonImage",
    "published",
    "showInGallery",
    "created",
    "updated"
  ]),

  LOCK_TIMEOUT_MS: 30000
});