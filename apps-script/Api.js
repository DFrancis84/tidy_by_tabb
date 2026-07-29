function Api_success(data, message, metadata) {
  return Api_json_({
    success: true,
    message: message || "",
    data: data === undefined ? null : data,
    metadata: metadata || {},
    timestamp: new Date().toISOString()
  });
}

function Api_error(error, fallbackMessage, metadata) {
  const normalizedError = Api_normalizeError_(error);

  console.error(JSON.stringify({
    message: normalizedError.message,
    stack: normalizedError.stack,
    metadata: metadata || {}
  }));

  return Api_json_({
    success: false,
    message:
      normalizedError.message ||
      fallbackMessage ||
      "An unexpected error occurred.",
    data: null,
    metadata: metadata || {},
    timestamp: new Date().toISOString()
  });
}

function Api_json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function Api_normalizeError_(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack || ""
    };
  }

  return {
    message: String(error || "Unknown error"),
    stack: ""
  };
}