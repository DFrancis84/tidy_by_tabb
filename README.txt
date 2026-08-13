TIDY BY TABB - REQUEST TO SERVICE FINALIZATION

Suggested branch:
cms-v2-request-to-service-finalize

PURPOSE

Finish the normal customer-request workflow before moving to Reviews:

Website Request -> CMS Review -> Accept -> Scheduled Service

This package also changes the public square-footage field from free-entry
numbers to the requested size-range dropdown.

FILES TO REPLACE

index.html
public-request-form.js
cloudflare-worker/src/public-cleaning-requests.js
cloudflare-worker/src/cleaning-requests-admin.js
admin/js/requests-inbox.js
admin/requests.html

NEW MIGRATION

cloudflare-worker/migrations/0006_add_square_footage_range.sql

REMOVE AFTER THIS BRANCH IS VERIFIED

admin/conflict-resolution-test.html

The conflict feature itself stays. Only the temporary test page can be deleted.

============================================================
1. RUN THE D1 MIGRATION
============================================================

Run 0006_add_square_footage_range.sql against the production D1 database.

This intentionally keeps the old integer square_footage column for legacy
requests and adds square_footage_range for new requests.

New allowed values:

Under 1,500 sqft
1,500 - 2,500 sq ft
2,500 - 3,500 sq ft
3,500 + sq ft

Old requests continue displaying their numeric square footage.

============================================================
2. DEPLOY WORKER
============================================================

Replace:

cloudflare-worker/src/public-cleaning-requests.js
cloudflare-worker/src/cleaning-requests-admin.js

Then deploy the Worker.

WHAT CHANGED

Public request API:
- accepts squareFootageRange
- still accepts legacy squareFootage during browser-cache transition
- stores the new range in square_footage_range
- stops returning internal client-match metadata to public callers
- improves phone matching for stored US numbers with an optional leading 1

Admin request conversion:
- requires a confirmed price
- preserves optimistic concurrency
- prevents converted requests from having their status moved backward

============================================================
3. DEPLOY GITHUB PAGES FILES
============================================================

Replace:

index.html
public-request-form.js
admin/js/requests-inbox.js
admin/requests.html

Public form:
- Approximate Square Footage is now a dropdown.

Admin Accept & Create Service:
- service type remains prefilled
- scheduled DATE is prefilled from the requested date when available
- scheduled TIME is explicitly chosen by the admin
- requested time window remains visible beside it
- confirmed price is required
- service notes are prefilled with useful request details
- browser converts the chosen local date/time to an ISO timestamp before
  sending it to the Worker, avoiding Cloudflare-runtime local-time ambiguity
- successful conversion refreshes both the drawer and Requests list

============================================================
4. TEST THE MONEY PATH
============================================================

PUBLIC FORM

1. Open tidybytabb.com.
2. Submit a normal cleaning request.
3. Confirm Square Footage is a dropdown with exactly four ranges.
4. Pick one range and submit.
5. Confirm success message appears and modal closes.

CMS REQUEST

6. Open CMS -> Requests.
7. Find the new request.
8. Open Review.
9. Confirm the selected square-footage range displays correctly.
10. Confirm Accept & Create Service is available.
11. Confirm Scheduled Date defaults to the customer's preferred date if one
    was submitted.
12. Choose an exact Scheduled Time.
13. Enter the confirmed price.
14. Review/edit the prefilled service notes.
15. Click Accept & Create Service.
16. Confirm the request changes to Converted.

SERVICES

17. Go to Services.
18. Confirm the new Service appears.
19. Confirm:
    - correct client
    - correct service type
    - correct local appointment date/time
    - status = Scheduled
    - correct price
    - notes carried over

REFRESH

20. Refresh the CMS.
21. Confirm the request remains Converted.
22. Confirm the Service remains Scheduled.

============================================================
5. CLEANUP
============================================================

Delete:

admin/conflict-resolution-test.html

Keep:
- request-conflict-resolution.js
- cleaning-request-conflicts.js
- the authenticated conflict route

We are only removing the temporary test harness, not the conflict feature.

============================================================
COMMIT MESSAGE
============================================================

Finalize cleaning request to service workflow
