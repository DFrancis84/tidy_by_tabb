TIDY BY TABB PUBLIC CLEANING REQUEST API

Branch:
cms-v2-cleaning-requests-api

ADD:
cloudflare-worker/src/public-cleaning-requests.js

UPDATE:
cloudflare-worker/src/index.js

OPTIONAL TEMPORARY TEST PAGE:
cloudflare-worker/test/public-cleaning-request.html

Use INDEX-CHANGES.txt for the two exact index.js edits.

ENDPOINT

POST /api/cleaning-requests

This endpoint is public, but it still requires the request Origin to be:
https://www.tidybytabb.com

MATCHING RULES

1. Exact normalized email and exact normalized phone match the same
   active client:
   - use that client
   - match_status = matched_email_and_phone

2. Only email matches:
   - use that client
   - match_status = matched_email

3. Only phone matches:
   - use that client
   - match_status = matched_phone

4. Neither matches:
   - create a new client
   - match_status = new_client

5. Email and phone point to different clients, or either value matches
   multiple active clients:
   - do not guess
   - do not create a new client
   - create request with client_id = NULL
   - match_status = conflict
   - status = needs_review

SECURITY

- Public route is handled before Cloudflare Access JWT validation.
- The existing origin allowlist still applies.
- All /admin/api routes remain protected.
- Payload size is limited to 64 KB.
- Unknown fields are rejected.
- Input lengths and numeric ranges are validated.
- The response does not reveal an existing client's identity.

DEPLOY

1. Upload the new module.
2. Apply both index.js changes.
3. Deploy the Worker.
4. Do not connect the real homepage form yet.
5. Use the temporary test page or browser console to test.

TEST CASES

A. New customer
- Use a unique email and phone.
- Expect clientCreated = true.
- Confirm one client and one cleaning_requests row were created.

B. Returning customer by email
- Reuse the email with a different phone.
- Expect clientMatched = true and clientCreated = false.
- Confirm no duplicate client was created.

C. Returning customer by phone
- Reuse the phone with a different email.
- Expect clientMatched = true and clientCreated = false.

D. Both match the same customer
- Reuse both.
- Expect clientMatched = true.

E. Conflict
- Use one client's email and another client's phone.
- Expect requiresManualReview = true.
- Confirm request status is needs_review and client_id is NULL.

D1 CHECK

SELECT
  id,
  client_id,
  submitted_first_name,
  submitted_last_name,
  submitted_email,
  submitted_phone,
  match_status,
  status,
  created_at
FROM cleaning_requests
ORDER BY created_at DESC;

COMMIT MESSAGE

Add public cleaning request API
