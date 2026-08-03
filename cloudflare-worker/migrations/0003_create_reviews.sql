CREATE TABLE reviews (
  id TEXT PRIMARY KEY,

  client_id TEXT,
  service_id TEXT,

  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL
    CHECK (rating BETWEEN 1 AND 5),

  review_text TEXT NOT NULL,
  source TEXT,
  review_date TEXT,

  status TEXT NOT NULL DEFAULT 'published'
    CHECK (
      status IN (
        'draft',
        'published',
        'hidden'
      )
    ),

  created_at TEXT NOT NULL
    DEFAULT (datetime('now')),

  updated_at TEXT NOT NULL
    DEFAULT (datetime('now')),

  deleted_at TEXT,

  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,

  version INTEGER NOT NULL DEFAULT 1,

  FOREIGN KEY (client_id)
    REFERENCES clients(id)
    ON DELETE SET NULL,

  FOREIGN KEY (service_id)
    REFERENCES services(id)
    ON DELETE SET NULL
) STRICT;

CREATE INDEX idx_reviews_active_status
ON reviews (
  deleted_at,
  status,
  review_date
);

CREATE INDEX idx_reviews_active_client
ON reviews (
  deleted_at,
  client_id
);

CREATE INDEX idx_reviews_active_service
ON reviews (
  deleted_at,
  service_id
);
