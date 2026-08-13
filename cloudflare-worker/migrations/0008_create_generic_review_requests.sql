CREATE TABLE generic_review_requests (
  id TEXT PRIMARY KEY,

  recipient_email TEXT NOT NULL,
  recipient_name TEXT,

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

  FOREIGN KEY (review_id)
    REFERENCES reviews(id)
    ON DELETE SET NULL
) STRICT;

CREATE INDEX idx_generic_review_requests_status
ON generic_review_requests (
  status,
  expires_at
);

CREATE INDEX idx_generic_review_requests_email
ON generic_review_requests (
  recipient_email,
  created_at
);
