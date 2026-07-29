const GalleryService = Object.freeze({
  list: function(filters) {
    const requestedFilters = filters || {};
    let records = GalleryRepository
      .list()
      .map(GalleryService.normalize)
      .filter(Boolean);

    const publishedFilter = Helpers_cleanString(
      requestedFilters.published
    ).toLowerCase();

    if (publishedFilter === "true") {
      records = records.filter(function(record) {
        return record.published === true;
      });
    }

    if (publishedFilter === "false") {
      records = records.filter(function(record) {
        return record.published === false;
      });
    }

    const categoryFilter = Helpers_cleanString(
      requestedFilters.category
    ).toLowerCase();

    if (categoryFilter) {
      records = records.filter(function(record) {
        return record.category.toLowerCase() === categoryFilter;
      });
    }

    const showInGalleryFilter = Helpers_cleanString(
      requestedFilters.showInGallery
    ).toLowerCase();

    if (showInGalleryFilter === "true") {
      records = records.filter(function(record) {
        return record.showInGallery === true;
      });
    }

    if (showInGalleryFilter === "false") {
      records = records.filter(function(record) {
        return record.showInGallery === false;
      });
    }

    return Helpers_sortNewestFirst(records);
  },

  get: function(recordId) {
    const normalizedId = Helpers_cleanString(recordId);

    if (!normalizedId) {
      throw new Error("A gallery record ID is required.");
    }

    const record = GalleryRepository.findById(normalizedId);

    if (!record) {
      throw new Error("Gallery record not found.");
    }

    return GalleryService.normalize(record);
  },

  create: function(payload) {
    const validated = Validation_galleryPayload(payload);
    const now = new Date();

    const record = {
      id: Utilities.getUuid(),
      title: validated.title,
      category: validated.category,
      beforeImage: validated.beforeImage,
      afterImage: validated.afterImage,
      comparisonImage: validated.comparisonImage,
      published: validated.published,
      showInGallery: validated.showInGallery,
      created: now,
      updated: now
    };

    const result = GalleryRepository.create(record);

    return {
      record: GalleryService.normalize(result.record),
      storage: result.storage
    };
  },

  update: function(recordId, payload) {
    const normalizedId = Helpers_cleanString(recordId);

    if (!normalizedId) {
      throw new Error("A gallery record ID is required.");
    }

    const existing = GalleryRepository.findById(normalizedId);

    if (!existing) {
      throw new Error("Gallery record not found.");
    }

    const validated = Validation_galleryPayload(payload);

    const updatedRecord = {
      id: normalizedId,
      title: validated.title,
      category: validated.category,
      beforeImage: validated.beforeImage,
      afterImage: validated.afterImage,
      comparisonImage: validated.comparisonImage,
      published: validated.published,
      showInGallery: validated.showInGallery,
      created: GalleryService.toDate(existing.created),
      updated: new Date()
    };

    const result = GalleryRepository.update(
      normalizedId,
      updatedRecord
    );

    return {
      record: GalleryService.normalize(result.record),
      storage: result.storage
    };
  },

  delete: function(recordId) {
    const normalizedId = Helpers_cleanString(recordId);

    if (!normalizedId) {
      throw new Error("A gallery record ID is required.");
    }

    const existing = GalleryRepository.findById(normalizedId);

    if (!existing) {
      throw new Error("Gallery record not found.");
    }

    const result = GalleryRepository.delete(normalizedId);

    return {
      record: GalleryService.normalize(result.record || existing),
      storage: result.storage
    };
  },

  normalize: function(record) {
    if (!record) {
      return null;
    }

    return {
      id: Helpers_cleanString(record.id),
      title: Helpers_cleanString(record.title),
      category: Helpers_cleanString(record.category),
      beforeImage: Helpers_cleanString(record.beforeImage),
      afterImage: Helpers_cleanString(record.afterImage),
      comparisonImage: Helpers_cleanString(record.comparisonImage),
      published: Helpers_toBoolean(record.published),
      showInGallery: Helpers_toBoolean(record.showInGallery),

      created:
        record.created instanceof Date
          ? record.created.toISOString()
          : Helpers_cleanString(record.created),

      updated:
        record.updated instanceof Date
          ? record.updated.toISOString()
          : Helpers_cleanString(record.updated)
    };
  },

  toDate: function(value) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }

    const parsedDate = new Date(value);

    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    return new Date();
  }
});