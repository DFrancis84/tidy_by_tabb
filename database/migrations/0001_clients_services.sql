PRAGMA foreign_keys = ON;

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL CHECK (length(first_name) BETWEEN 1 AND 100),
  last_name TEXT NOT NULL CHECK (length(last_name) BETWEEN 1 AND 100),
  email TEXT CHECK (email IS NULL OR length(email) <= 254),
  phone TEXT CHECK (phone IS NULL OR length(phone) <= 30),
  address_line1 TEXT, address_line2 TEXT, city TEXT, state TEXT, postal_code TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
) STRICT;
CREATE INDEX idx_clients_active_name ON clients (deleted_at, last_name, first_name);
CREATE INDEX idx_clients_active_email ON clients (deleted_at, email);

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_type TEXT NOT NULL CHECK (length(service_type) BETWEEN 1 AND 150),
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_start TEXT,
  scheduled_end TEXT,
  completed_at TEXT,
  price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (scheduled_end IS NULL OR scheduled_start IS NULL OR scheduled_end > scheduled_start),
  CHECK (status <> 'completed' OR completed_at IS NOT NULL)
) STRICT;
CREATE INDEX idx_services_active_client ON services (client_id, deleted_at, scheduled_start);
CREATE INDEX idx_services_active_status ON services (deleted_at, status, scheduled_start);
