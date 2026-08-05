CREATE TABLE cleaning_requests (
  id TEXT PRIMARY KEY,

  client_id TEXT,
  converted_service_id TEXT,

  submitted_first_name TEXT NOT NULL,
  submitted_last_name TEXT NOT NULL,
  submitted_email TEXT,
  submitted_phone TEXT,

  normalized_email TEXT,
  normalized_phone TEXT,

  submitted_address_line1 TEXT,
  submitted_address_line2 TEXT,
  submitted_city TEXT,
  submitted_state TEXT,
  submitted_postal_code TEXT,

  requested_service_type TEXT NOT NULL,
  requested_add_ons TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(requested_add_ons)),

  preferred_date TEXT,
  preferred_time_window TEXT,

  property_type TEXT,
  bedrooms INTEGER
    CHECK (
      bedrooms IS NULL OR bedrooms >= 0
    ),
  bathrooms REAL
    CHECK (
      bathrooms IS NULL OR bathrooms >= 0
    ),
  square_footage INTEGER
    CHECK (
      square_footage IS NULL OR square_footage >= 0
    ),

  property_condition TEXT,
  pets TEXT,
  entry_instructions TEXT,
  customer_notes TEXT,

  match_status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (
      match_status IN (
        'new_client',
        'matched_email',
        'matched_phone',
        'matched_email_and_phone',
        'conflict',
        'unmatched'
      )
    ),

  status TEXT NOT NULL DEFAULT 'new'
    CHECK (
      status IN (
        'new',
        'needs_review',
        'contacted',
        'accepted',
        'declined',
        'converted',
        'archived'
      )
    ),

  internal_notes TEXT,

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

  FOREIGN KEY (converted_service_id)
    REFERENCES services(id)
    ON DELETE SET NULL
) STRICT;

CREATE INDEX idx_cleaning_requests_active_status
ON cleaning_requests (
  deleted_at,
  status,
  created_at
);

CREATE INDEX idx_cleaning_requests_active_client
ON cleaning_requests (
  deleted_at,
  client_id,
  created_at
);

CREATE INDEX idx_cleaning_requests_match_status
ON cleaning_requests (
  deleted_at,
  match_status,
  created_at
);

CREATE INDEX idx_cleaning_requests_normalized_email
ON cleaning_requests (
  normalized_email
)
WHERE normalized_email IS NOT NULL;

CREATE INDEX idx_cleaning_requests_normalized_phone
ON cleaning_requests (
  normalized_phone
)
WHERE normalized_phone IS NOT NULL;

CREATE UNIQUE INDEX idx_cleaning_requests_converted_service
ON cleaning_requests (
  converted_service_id
)
WHERE converted_service_id IS NOT NULL;
