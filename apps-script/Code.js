function doGet(event) {
  const parameters =
    event && event.parameter
      ? event.parameter
      : {};

  const action =
    Helpers_cleanString(parameters.action).toLowerCase() ||
    "list";

  try {
    switch (action) {
      case "health":
        return Api_success(
          {
            app: CONFIG.APP_NAME,
            version: CONFIG.API_VERSION,
            status: "online"
          },
          "CMS API is online."
        );

      case "diagnostics":
        return Code_diagnostics_();

      case "list":
        return Api_success(
          GalleryService.list({
            published: parameters.published || "all",
            category: parameters.category,
            showInGallery: parameters.showInGallery
          }),
          "Gallery records loaded."
        );

      case "get":
        return Api_success(
          GalleryService.get(parameters.id),
          "Gallery record loaded."
        );

      case "imagedata":
        return Api_success(
          MediaService.getImageData({
            url: parameters.url,
            fileId: parameters.fileId
          }),
          "Image data loaded."
        );

      default:
        throw new Error(
          "Unsupported GET action: " + action
        );
    }
  } catch (error) {
    return Api_error(
      error,
      "Unable to process the GET request.",
      {
        action: action
      }
    );
  }
}

function doPost(event) {
  let action = "";

  try {
    const body = Helpers_parsePostBody(event);

    const parameterAction =
      event &&
      event.parameter &&
      event.parameter.action
        ? event.parameter.action
        : "";

    action = Helpers_cleanString(
      body.action || parameterAction
    ).toLowerCase();

    Code_requireGatewayAuthorization_(body, action);

    const payload =
      body.record ||
      body.payload ||
      body.data ||
      body;

    switch (action) {
      case "create":
        return Code_createRecord_(payload);

      case "update":
        return Code_updateRecord_(body, payload);

      case "delete":
        return Code_deleteRecord_(body, payload);

      case "uploadimage":
        return Code_uploadImage_(payload);

      default:
        throw new Error(
          'Unsupported POST action. Use "create", "update", ' +
          '"delete", or "uploadImage".'
        );
    }
  } catch (error) {
    return Api_error(
      error,
      "Unable to process the POST request.",
      {
        action: action || "unknown"
      }
    );
  }
}

function Code_requireGatewayAuthorization_(body, action) {
  const mutationActions = [
    "create",
    "update",
    "delete",
    "uploadimage"
  ];

  if (mutationActions.indexOf(action) === -1) {
    return;
  }

  const expectedSecret = Helpers_cleanString(
    PropertiesService
      .getScriptProperties()
      .getProperty(CONFIG.GATEWAY_SECRET_PROPERTY)
  );

  const suppliedSecret = Helpers_cleanString(
    body && body.gatewaySecret
  );

  const actorEmail = Helpers_cleanString(
    body && body.actorEmail
  ).toLowerCase();

  if (!expectedSecret) {
    throw new Error(
      "Mutation gateway authorization is not configured."
    );
  }

  if (
    !suppliedSecret ||
    !Code_secureStringEquals_(suppliedSecret, expectedSecret)
  ) {
    throw new Error("Mutation authorization failed.");
  }

  if (!actorEmail || actorEmail.indexOf("@") <= 0) {
    throw new Error("Authenticated administrator email is required.");
  }
}

function Code_secureStringEquals_(left, right) {
  const leftValue = String(left || "");
  const rightValue = String(right || "");
  const maxLength = Math.max(leftValue.length, rightValue.length);
  let difference = leftValue.length ^ rightValue.length;

  for (let index = 0; index < maxLength; index += 1) {
    difference |=
      (leftValue.charCodeAt(index) || 0) ^
      (rightValue.charCodeAt(index) || 0);
  }

  return difference === 0;
}

function Code_createRecord_(payload) {
  const result = GalleryService.create(payload);

  return Api_success(
    result.record,
    "Transformation created.",
    {
      storage: result.storage
    }
  );
}

function Code_updateRecord_(body, payload) {
  const recordId = Helpers_cleanString(
    body.id || payload.id
  );

  if (!recordId) {
    throw new Error(
      "A gallery record ID is required."
    );
  }

  const result = GalleryService.update(
    recordId,
    payload
  );

  return Api_success(
    result.record,
    "Transformation updated.",
    {
      storage: result.storage
    }
  );
}

function Code_deleteRecord_(body, payload) {
  const recordId = Helpers_cleanString(
    body.id ||
    (
      body.payload &&
      body.payload.id
    ) ||
    (
      body.record &&
      body.record.id
    ) ||
    payload.id
  );

  if (!recordId) {
    throw new Error(
      "A gallery record ID is required."
    );
  }

  const existingRecord =
    GalleryService.get(recordId);

  const requestedFiles =
    body.payload &&
    body.payload.deleteFiles
      ? body.payload.deleteFiles
      : {};

  const filesToTrash = {};

  if (
    Helpers_toBoolean(
      requestedFiles.beforeImage
    ) &&
    existingRecord.beforeImage
  ) {
    filesToTrash.beforeImage =
      existingRecord.beforeImage;
  }

  if (
    Helpers_toBoolean(
      requestedFiles.afterImage
    ) &&
    existingRecord.afterImage
  ) {
    filesToTrash.afterImage =
      existingRecord.afterImage;
  }

  if (
    Helpers_toBoolean(
      requestedFiles.comparisonImage
    ) &&
    existingRecord.comparisonImage
  ) {
    filesToTrash.comparisonImage =
      existingRecord.comparisonImage;
  }

  const result =
    GalleryService.delete(recordId);

  const driveCleanup =
    Object.keys(filesToTrash).length > 0
      ? MediaService.trashFiles(filesToTrash)
      : {
          trashed: [],
          skipped: [],
          failed: []
        };

  return Api_success(
    result.record,
    "Transformation deleted.",
    {
      storage: result.storage,
      driveCleanup: driveCleanup
    }
  );
}

function Code_uploadImage_(payload) {
  const result =
    MediaService.uploadImage(payload);

  return Api_success(
    result,
    "Image uploaded.",
    {
      storage: {
        folderId: result.folderId,
        folderName: result.folderName
      }
    }
  );
}

function Code_diagnostics_() {
  const spreadsheet =
    Helpers_getSpreadsheet();

  const sheet =
    Helpers_getSheetOrThrow(
      CONFIG.GALLERY_SHEET_NAME
    );

  const folder =
    Helpers_getUploadFolder();

  return Api_success(
    {
      app: CONFIG.APP_NAME,
      version: CONFIG.API_VERSION,

      spreadsheet: {
        id: spreadsheet.getId(),
        name: spreadsheet.getName(),
        url: spreadsheet.getUrl()
      },

      gallerySheet: {
        name: sheet.getName(),
        lastRow: sheet.getLastRow(),
        lastColumn: sheet.getLastColumn(),
        headers: Helpers_getHeaders(sheet)
      },

      uploadFolder: {
        id: folder.getId(),
        name: folder.getName()
      }
    },
    "CMS diagnostics loaded."
  );
}
