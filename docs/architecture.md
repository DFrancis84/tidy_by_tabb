# Architecture

Tidy by Tabb CMS v2 keeps GitHub Pages as the static frontend and uses one
Cloudflare Worker as the authenticated application boundary. Cloudflare Access
authenticates administrators; the Worker verifies the JWT and allowlist before
executing business rules.

Clients and Services use D1. The existing `/admin/api` Gallery mutation route
continues to proxy to Google Apps Script until Gallery migration is separately
approved. This is intentionally additive and preserves the working Gallery.

Clients own customer identity. Services reference a client and contain only
engagement-specific facts such as schedule, status, notes, and agreed price.
Deletes archive rows using `deleted_at`; `version` provides optimistic
concurrency protection against silent overwrites.
