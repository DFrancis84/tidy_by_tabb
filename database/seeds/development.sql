-- Local development only. Never apply to production.
INSERT INTO clients
  (id, first_name, last_name, email, created_by, updated_by)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'Sample', 'Client',
   'sample@example.com', 'developer@local.test', 'developer@local.test');
