const MediaService = Object.freeze({
  uploadImage: function(payload) {
    const validated = Validation_uploadPayload(payload);

    const bytes = Utilities.base64Decode(validated.base64);
    const cleanFileName = Helpers_safeFileName(
      validated.fileName
    );

    const blob = Utilities.newBlob(
      bytes,
      validated.mimeType,
      cleanFileName
    );

    const folder = Helpers_getUploadFolder();
    const file = folder.createFile(blob);

    /*
     * Needed for the website/admin to display the image.
     * Some Workspace organizations block public sharing.
     */
    try {
      file.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
      );
    } catch (error) {
      console.warn(
        "Could not enable anyone-with-link sharing: " +
        error.message
      );
    }

    return {
      id: file.getId(),
      name: file.getName(),
      mimeType: file.getMimeType(),
      size: file.getSize(),
      url: Helpers_driveViewUrl(file.getId()),
      thumbnailUrl: Helpers_driveThumbnailUrl(
        file.getId(),
        1200
      ),
      driveUrl: file.getUrl(),
      folderId: folder.getId(),
      folderName: folder.getName()
    };
  }
,


  trashFiles: function(fileUrls) {
    const requested = fileUrls || {};
    const result = {
      trashed: [],
      skipped: [],
      failed: []
    };

    Object.keys(requested).forEach(function(key) {
      const source = Helpers_cleanString(requested[key]);

      if (!source) {
        result.skipped.push({
          field: key,
          reason: "No file URL supplied."
        });
        return;
      }

      const fileId = MediaService_extractDriveFileId_(source);

      if (!fileId) {
        result.failed.push({
          field: key,
          reason: "The Drive file ID could not be extracted."
        });
        return;
      }

      try {
        const file = DriveApp.getFileById(fileId);
        const name = file.getName();

        file.setTrashed(true);

        result.trashed.push({
          field: key,
          id: fileId,
          name: name
        });
      } catch (error) {
        result.failed.push({
          field: key,
          id: fileId,
          reason: error.message
        });
      }
    });

    return result;
  },

  getImageData: function(payload) {
    const input = payload || {};
    const source = Helpers_cleanString(
      input.url || input.fileId
    );

    if (!source) {
      throw new Error("An image URL or Drive file ID is required.");
    }

    const fileId = MediaService_extractDriveFileId_(source);

    if (!fileId) {
      throw new Error(
        "The image is not a recognized Google Drive file."
      );
    }

    let file;

    try {
      file = DriveApp.getFileById(fileId);
    } catch (error) {
      throw new Error(
        "Unable to read the image from Google Drive."
      );
    }

    const blob = file.getBlob();
    const mimeType = Helpers_cleanString(
      blob.getContentType()
    ).toLowerCase();

    if (CONFIG.ALLOWED_IMAGE_TYPES.indexOf(mimeType) === -1) {
      throw new Error(
        "The selected Drive file is not a supported image."
      );
    }

    const bytes = blob.getBytes();

    if (bytes.length > CONFIG.MAX_UPLOAD_BYTES) {
      throw new Error(
        "The stored image is too large to process. Maximum size is 10 MB."
      );
    }

    return {
      id: fileId,
      name: file.getName(),
      mimeType: mimeType,
      dataUrl:
        "data:" +
        mimeType +
        ";base64," +
        Utilities.base64Encode(bytes)
    };
  }
});

function MediaService_extractDriveFileId_(value) {
  const source = Helpers_cleanString(value);

  if (!source) {
    return "";
  }

  if (/^[a-zA-Z0-9_-]{20,}$/.test(source)) {
    return source;
  }

  const patterns = [
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/
  ];

  for (let index = 0; index < patterns.length; index += 1) {
    const match = source.match(patterns[index]);

    if (match && match[1]) {
      return match[1];
    }
  }

  return "";
}
