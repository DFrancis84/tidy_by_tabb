function Helpers_getSpreadsheet() {
  const spreadsheetId = Helpers_cleanString(CONFIG.SPREADSHEET_ID);

  if (!spreadsheetId) {
    throw new Error("Set CONFIG.SPREADSHEET_ID in Config.gs.");
  }

  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (error) {
    throw new Error(
      "Unable to open the configured spreadsheet. Check the ID and deployment permissions."
    );
  }
}

function Helpers_getSheetOrThrow(sheetName) {
  const spreadsheet = Helpers_getSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(
      'Sheet "' + sheetName + '" does not exist. Run setupCms() first.'
    );
  }

  return sheet;
}

function Helpers_getHeaders(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return [];

  return sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(Helpers_cleanString);
}

function Helpers_validateHeaders(actualHeaders, requiredHeaders) {
  const missing = requiredHeaders.filter(function(header) {
    return actualHeaders.indexOf(header) === -1;
  });

  if (missing.length > 0) {
    throw new Error(
      "Gallery sheet is missing columns: " + missing.join(", ")
    );
  }
}

function Helpers_rowToObject(headers, row) {
  return headers.reduce(function(record, header, index) {
    record[header] = Helpers_serializeValue(row[index]);
    return record;
  }, {});
}

function Helpers_objectToRow(headers, record) {
  return headers.map(function(header) {
    return record[header] === undefined ? "" : record[header];
  });
}

function Helpers_serializeValue(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function Helpers_cleanString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function Helpers_toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  return ["true", "1", "yes", "on", "published"].indexOf(
    Helpers_cleanString(value).toLowerCase()
  ) !== -1;
}

function Helpers_parsePostBody(event) {
  if (!event || !event.postData || !event.postData.contents) {
    return {};
  }

  const contents = Helpers_cleanString(event.postData.contents);
  if (!contents) return {};

  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error("The submitted request body is not valid JSON.");
  }
}

function Helpers_findRowById(sheet, headers, recordId) {
  const normalizedId = Helpers_cleanString(recordId);
  const idColumnIndex = headers.indexOf("id");

  if (!normalizedId) {
    throw new Error("A gallery record ID is required.");
  }

  if (idColumnIndex === -1) {
    throw new Error(
      'The Gallery sheet does not contain an "id" column.'
    );
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const values = sheet
    .getRange(2, idColumnIndex + 1, lastRow - 1, 1)
    .getValues()
    .flat();

  const matchIndex = values.findIndex(function(value) {
    return Helpers_cleanString(value) === normalizedId;
  });

  return matchIndex === -1 ? -1 : matchIndex + 2;
}

function Helpers_sortNewestFirst(records) {
  return records.sort(function(a, b) {
    return (
      new Date(b.updated || b.created || 0).getTime() -
      new Date(a.updated || a.created || 0).getTime()
    );
  });
}

function Helpers_withScriptLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(CONFIG.LOCK_TIMEOUT_MS);

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function Helpers_getUploadFolder() {
  const configuredId = Helpers_cleanString(
    CONFIG.DRIVE_UPLOAD_FOLDER_ID
  );

  if (configuredId) {
    try {
      return DriveApp.getFolderById(configuredId);
    } catch (error) {
      throw new Error(
        "Unable to open the configured Drive upload folder."
      );
    }
  }

  const folderName =
    Helpers_cleanString(CONFIG.DRIVE_UPLOAD_FOLDER_NAME) ||
    "Tidy by Tabb CMS Uploads";

  const matches = DriveApp.getFoldersByName(folderName);
  return matches.hasNext()
    ? matches.next()
    : DriveApp.createFolder(folderName);
}

function Helpers_safeFileName(value) {
  const source = Helpers_cleanString(value);

  if (!source) {
    return "tidy-image.jpg";
  }

  const extensionMatch = source.match(
    /\.([a-zA-Z0-9]+)$/
  );

  const extension = extensionMatch
    ? "." + extensionMatch[1].toLowerCase()
    : "";

  const baseName = extension
    ? source.slice(0, -extension.length)
    : source;

  const cleanBase = baseName
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return (cleanBase || "tidy-image") + extension;
}

function Helpers_driveViewUrl(fileId) {
  return "https://drive.google.com/uc?export=view&id=" +
    encodeURIComponent(fileId);
}

function Helpers_driveThumbnailUrl(fileId, width) {
  return "https://drive.google.com/thumbnail?id=" +
    encodeURIComponent(fileId) +
    "&sz=w" +
    Number(width || 1200);
}