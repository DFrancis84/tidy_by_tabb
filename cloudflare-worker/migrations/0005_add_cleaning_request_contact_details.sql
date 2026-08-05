-- Tidy by Tabb CMS v2
-- Add customer communication and marketing details to cleaning requests.

ALTER TABLE cleaning_requests
ADD COLUMN preferred_contact_method TEXT
  CHECK (
    preferred_contact_method IS NULL
    OR preferred_contact_method IN ('email', 'phone', 'either')
  );

ALTER TABLE cleaning_requests
ADD COLUMN referred_by TEXT;

ALTER TABLE cleaning_requests
ADD COLUMN mailing_list_opt_in INTEGER NOT NULL DEFAULT 0
  CHECK (mailing_list_opt_in IN (0, 1));

CREATE INDEX IF NOT EXISTS
  idx_cleaning_requests_mailing_list_opt_in
ON cleaning_requests (
  mailing_list_opt_in,
  created_at DESC
)
WHERE deleted_at IS NULL;
