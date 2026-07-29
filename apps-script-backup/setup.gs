function setupCms() {
  const spreadsheet = Helpers_getSpreadsheet();

  let gallerySheet = spreadsheet.getSheetByName(
    CONFIG.GALLERY_SHEET_NAME
  );

  if (!gallerySheet) {
    gallerySheet = spreadsheet.insertSheet(
      CONFIG.GALLERY_SHEET_NAME
    );
  }

  Setup_configureGallerySheet_(gallerySheet);
  const uploadFolder = Helpers_getUploadFolder();

  SpreadsheetApp.flush();

  return {
    ready: true,
    appName: CONFIG.APP_NAME,
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl(),
    gallerySheet: gallerySheet.getName(),
    uploadFolderId: uploadFolder.getId(),
    uploadFolderName: uploadFolder.getName(),
    lastRow: gallerySheet.getLastRow(),
    headers: Helpers_getHeaders(gallerySheet)
  };
}

function Setup_configureGallerySheet_(sheet) {
  const headers = CONFIG.GALLERY_HEADERS;

  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers]);

  sheet.setFrozenRows(1);

  sheet
    .getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#19324a")
    .setFontColor("#ffffff");

  [250, 220, 140, 350, 350, 350, 100, 100, 190, 190]
    .forEach(function(width, index) {
      sheet.setColumnWidth(index + 1, width);
    });

  const checkboxRule = SpreadsheetApp
    .newDataValidation()
    .requireCheckbox()
    .setAllowInvalid(false)
    .build();

  sheet
    .getRange(
      2,
      7,
      Math.max(sheet.getMaxRows() - 1, 1),
      2
    )
    .setDataValidation(checkboxRule);
}

function compactGalleryRows() {
  const sheet = Helpers_getSheetOrThrow(
    CONFIG.GALLERY_SHEET_NAME
  );

  const headers = Helpers_getHeaders(sheet);
  Helpers_validateHeaders(headers, CONFIG.GALLERY_HEADERS);

  const maxRows = sheet.getMaxRows();

  const rows = sheet
    .getRange(2, 1, maxRows - 1, headers.length)
    .getValues()
    .filter(function(row) {
      return Helpers_cleanString(row[0]) !== "";
    });

  sheet
    .getRange(2, 1, maxRows - 1, headers.length)
    .clearContent();

  if (rows.length > 0) {
    sheet
      .getRange(2, 1, rows.length, headers.length)
      .setValues(rows);
  }

  SpreadsheetApp.flush();

  return {
    movedRecords: rows.length,
    firstDataRow: rows.length > 0 ? 2 : null,
    lastDataRow: rows.length > 0 ? rows.length + 1 : null
  };
}