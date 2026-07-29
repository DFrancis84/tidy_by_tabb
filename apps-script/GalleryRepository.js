const GalleryRepository = Object.freeze({
  list: function() {
    const sheet = Helpers_getSheetOrThrow(CONFIG.GALLERY_SHEET_NAME);
    const headers = Helpers_getHeaders(sheet);
    Helpers_validateHeaders(headers, CONFIG.GALLERY_HEADERS);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    return sheet
      .getRange(2, 1, lastRow - 1, headers.length)
      .getValues()
      .filter(function(row) {
        return Helpers_cleanString(row[0]) !== "";
      })
      .map(function(row) {
        return Helpers_rowToObject(headers, row);
      });
  },

  findById: function(recordId) {
    const sheet = Helpers_getSheetOrThrow(CONFIG.GALLERY_SHEET_NAME);
    const headers = Helpers_getHeaders(sheet);
    Helpers_validateHeaders(headers, CONFIG.GALLERY_HEADERS);

    const rowNumber = Helpers_findRowById(sheet, headers, recordId);
    if (rowNumber === -1) return null;

    const row = sheet
      .getRange(rowNumber, 1, 1, headers.length)
      .getValues()[0];

    return Helpers_rowToObject(headers, row);
  },

  create: function(record) {
    return Helpers_withScriptLock(function() {
      const sheet = Helpers_getSheetOrThrow(CONFIG.GALLERY_SHEET_NAME);
      const headers = Helpers_getHeaders(sheet);
      Helpers_validateHeaders(headers, CONFIG.GALLERY_HEADERS);

      const row = Helpers_objectToRow(headers, record);
      const writtenRowNumber =
        GalleryRepository_getNextRow_(sheet, headers);

      sheet
        .getRange(writtenRowNumber, 1, 1, headers.length)
        .setValues([row]);

      SpreadsheetApp.flush();

      return {
        record: GalleryRepository.findById(record.id),
        storage: {
          spreadsheetId: Helpers_getSpreadsheet().getId(),
          sheetName: sheet.getName(),
          rowNumber: writtenRowNumber
        }
      };
    });
  },

  update: function(recordId, record) {
    return Helpers_withScriptLock(function() {
      const sheet = Helpers_getSheetOrThrow(CONFIG.GALLERY_SHEET_NAME);
      const headers = Helpers_getHeaders(sheet);
      Helpers_validateHeaders(headers, CONFIG.GALLERY_HEADERS);

      const rowNumber = Helpers_findRowById(
        sheet,
        headers,
        recordId
      );

      if (rowNumber === -1) {
        throw new Error("Gallery record not found.");
      }

      const row = Helpers_objectToRow(headers, record);

      sheet
        .getRange(rowNumber, 1, 1, headers.length)
        .setValues([row]);

      SpreadsheetApp.flush();

      return {
        record: GalleryRepository.findById(recordId),
        storage: {
          spreadsheetId: Helpers_getSpreadsheet().getId(),
          sheetName: sheet.getName(),
          rowNumber: rowNumber
        }
      };
    });
  },

  delete: function(recordId) {
    return Helpers_withScriptLock(function() {
      const sheet = Helpers_getSheetOrThrow(CONFIG.GALLERY_SHEET_NAME);
      const headers = Helpers_getHeaders(sheet);
      Helpers_validateHeaders(headers, CONFIG.GALLERY_HEADERS);

      const rowNumber = Helpers_findRowById(
        sheet,
        headers,
        recordId
      );

      if (rowNumber === -1) {
        throw new Error("Gallery record not found.");
      }

      const existing = GalleryRepository.findById(recordId);

      sheet.deleteRow(rowNumber);
      SpreadsheetApp.flush();

      return {
        record: existing,
        storage: {
          spreadsheetId: Helpers_getSpreadsheet().getId(),
          sheetName: sheet.getName(),
          deletedRowNumber: rowNumber
        }
      };
    });
  }
});

function GalleryRepository_getNextRow_(sheet, headers) {
  const idColumnIndex = headers.indexOf("id");

  if (idColumnIndex === -1) {
    throw new Error(
      'The Gallery sheet does not contain an "id" column.'
    );
  }

  const maxRows = sheet.getMaxRows();

  if (maxRows < 2) {
    sheet.insertRowAfter(1);
    return 2;
  }

  const idValues = sheet
    .getRange(2, idColumnIndex + 1, maxRows - 1, 1)
    .getDisplayValues();

  const firstEmptyIndex = idValues.findIndex(function(row) {
    return Helpers_cleanString(row[0]) === "";
  });

  if (firstEmptyIndex !== -1) {
    return firstEmptyIndex + 2;
  }

  sheet.insertRowAfter(maxRows);
  return maxRows + 1;
}