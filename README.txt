TIDY BY TABB CLEANING REQUESTS ADMIN INBOX

Branch:
cms-v2-cleaning-requests-admin-inbox

ADD THESE FILES

admin/requests.html
admin/css/requests-inbox.css
admin/js/requests-api.js
admin/js/requests-inbox.js
cloudflare-worker/src/cleaning-requests-admin.js

UPDATE

cloudflare-worker/src/index.js
admin/index.html

Use INDEX-CHANGES.txt for the exact small edits.

FEATURES

- Searchable and filterable request inbox
- Statuses: new, needs review, contacted, accepted, declined,
  converted, and archived
- Full customer, property, request, referral, contact preference,
  mailing-list, and add-on details
- Internal notes
- Client-match conflict warning
- Optimistic concurrency for request updates
- Accept & Create Service workflow
- Converted-service link information
- Mobile-friendly standalone Requests workspace

DEPLOYMENT

1. Upload all new files and apply INDEX-CHANGES.txt.
2. Merge the branch.
3. In the Cloudflare Worker editor, add:
   cleaning-requests-admin.js
4. Update index.js with the import and route handler.
5. Deploy the Worker.
6. Wait for GitHub Pages.
7. Open:
   https://www.tidybytabb.com/admin/requests.html

No new D1 migration is required for this slice.

TESTS

1. Open the inbox and verify requests load.
2. Filter by New and Needs review.
3. Search by customer email or phone.
4. Open a request and save internal notes.
5. Mark a request Contacted.
6. Open a request with a linked client.
7. Enter a scheduled start and click Accept & Create Service.
8. Confirm the request becomes Converted.
9. Confirm the new service appears in Services.
10. Open two browser tabs on the same request, save in one, then save
    in the stale tab. Expect a 409 refresh message.

IMPORTANT CONVERSION RULE

Requests with a client match conflict cannot be converted until a
future conflict-resolution workflow links the correct client. The inbox
shows the conflict clearly and disables conversion.

COMMIT MESSAGE

Add cleaning requests admin inbox
