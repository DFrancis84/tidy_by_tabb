ALTER TABLE review_requests ADD COLUMN email_sent_at TEXT;
ALTER TABLE review_requests ADD COLUMN email_sent_to TEXT;
ALTER TABLE review_requests ADD COLUMN email_send_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE review_requests ADD COLUMN email_provider_id TEXT;

ALTER TABLE generic_review_requests ADD COLUMN email_sent_at TEXT;
ALTER TABLE generic_review_requests ADD COLUMN email_sent_to TEXT;
ALTER TABLE generic_review_requests ADD COLUMN email_send_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE generic_review_requests ADD COLUMN email_provider_id TEXT;
