function Validation_galleryPayload(payload) {
  const input = payload || {};

  const record = {
    title: Helpers_cleanString(input.title),
    category: Helpers_cleanString(input.category),
    beforeImage: Helpers_cleanString(input.beforeImage),
    afterImage: Helpers_cleanString(input.afterImage),
    comparisonImage: Helpers_cleanString(input.comparisonImage),
    showInGallery: Helpers_toBoolean(input.showInGallery),
    published: Helpers_toBoolean(input.published)
  };

  const errors = [];

  if (!record.title) errors.push("A transformation title is required.");
  if (record.title.length > 80) {
    errors.push("The transformation title cannot exceed 80 characters.");
  }
  if (!record.category) errors.push("A transformation category is required.");
  if (!record.beforeImage) errors.push("A Before image is required.");

  if (record.published && (!record.afterImage || !record.comparisonImage)) {
    errors.push(
      "Published transformations require an After image and a saved comparison image."
    );
  }

  if (record.showInGallery && !record.published) {
    errors.push("Only published transformations can be shown in the Gallery.");
  }

  Validation_addUrlError_(errors, record.beforeImage, "Before image");
  Validation_addUrlError_(errors, record.afterImage, "After image");
  Validation_addUrlError_(errors, record.comparisonImage, "Comparison image");

  if (errors.length > 0) throw new Error(errors.join(" "));
  return record;
}

function Validation_uploadPayload(payload) {
  const input = payload || {};
  const dataUrl = Helpers_cleanString(input.dataUrl);
  const fileName = Helpers_safeFileName(input.fileName);
  const mimeType = Helpers_cleanString(input.mimeType).toLowerCase();

  if (!dataUrl) throw new Error("An image is required.");

  if (CONFIG.ALLOWED_IMAGE_TYPES.indexOf(mimeType) === -1) {
    throw new Error("Only JPG, PNG, and WebP images are supported.");
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("The uploaded image data is invalid.");

  const estimatedBytes = Math.floor(match[2].length * 0.75);
  if (estimatedBytes > CONFIG.MAX_UPLOAD_BYTES) {
    throw new Error("The image is too large. Maximum upload size is 10 MB.");
  }

  return {
    fileName: fileName,
    mimeType: mimeType,
    base64: match[2]
  };
}

function Validation_addUrlError_(errors, value, fieldName) {
  if (!value) return;
  if (!/^https?:\/\/.+/i.test(value)) {
    errors.push(fieldName + " must begin with http:// or https://.");
  }
}
