CREATE TABLE review_requests (
  id TEXT PRIMARY KEY,

  client_id TEXT NOT NULL,
  service_id TEXT NOT NULL,

  token_hash TEXT NOT NULL UNIQUE,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'submitted',
        'revoked',
        'expired'
      )
    ),

  expires_at TEXT NOT NULL,
  submitted_at TEXT,
  review_id TEXT,

  created_at TEXT NOT NULL
    DEFAULT (datetime('now')),

  updated_at TEXT NOT NULL
    DEFAULT (datetime('now')),

  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,

  version INTEGER NOT NULL DEFAULT 1,

  FOREIGN KEY (client_id)
    REFERENCES clients(id)
    ON DELETE CASCADE,

  FOREIGN KEY (service_id)
    REFERENCES services(id)
    ON DELETE CASCADE,

  FOREIGN KEY (review_id)
    REFERENCES reviews(id)
    ON DELETE SET NULL
) STRICT;

CREATE INDEX idx_review_requests_client
ON review_requests (
  client_id,
  created_at
);

CREATE INDEX idx_review_requests_service
ON review_requests (
  service_id,
  created_at
);

CREATE INDEX idx_review_requests_status
ON review_requests (
  status,
  expires_at
);

CREATE UNIQUE INDEX idx_review_requests_one_pending_per_service
ON review_requests (
  service_id
)
WHERE status = 'pending';
