TIDY BY TABB CLEANING REQUESTS SCHEMA

Branch:
cms-v2-cleaning-requests-schema

ADD:
cloudflare-worker/migrations/0004_create_cleaning_requests.sql

WHAT THIS MIGRATION CREATES

- cleaning_requests table
- Optional link to an existing or newly created client
- Optional link to the Service created from an accepted request
- Submitted contact and address snapshot
- Normalized email and phone fields for exact matching
- Requested service type and JSON add-on list
- Preferred date and time window
- Property details and customer notes
- Private internal notes
- Request status and match status
- Soft-delete fields
- Optimistic concurrency through version
- Foreign keys to clients and services
- Indexes for admin inbox, matching, and conversion

REQUEST STATUSES

- new
- needs_review
- contacted
- accepted
- declined
- converted
- archived

MATCH STATUSES

- new_client
- matched_email
- matched_phone
- matched_email_and_phone
- conflict
- unmatched

IMPORTANT DESIGN NOTES

1. requested_add_ons is JSON text and must contain a valid JSON value.
   The submission API will store an array such as:

   ["Inside Oven", "Baseboards"]

2. The request preserves exactly what the customer submitted, even when
   it links to an existing client.

3. The migration does not yet change the public form or Worker routes.
   Those belong to the next API slice.

4. The migration does not create a Service. A Service is created later
   only after Tabb reviews and accepts the request.

APPLY TO D1

Using the Cloudflare dashboard:

1. Open Workers & Pages.
2. Open D1.
3. Select the tidy-by-tabb database.
4. Open Console.
5. Paste the full contents of:
   cloudflare-worker/migrations/0004_create_cleaning_requests.sql
6. Run the statement.

VERIFY

Run the statements from VERIFY.sql.

Expected:
- cleaning_requests exists as a table
- version defaults to 1
- status defaults to new
- match_status defaults to unmatched
- cleaning_request_count is 0

COMMIT MESSAGE

Add cleaning requests schema

ROLLBACK DURING DEVELOPMENT ONLY

Do not run this after real request data exists.

DROP TABLE cleaning_requests;
