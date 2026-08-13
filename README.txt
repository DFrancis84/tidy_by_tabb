TIDY BY TABB - REVIEW REQUEST WORKFLOW V1

Suggested branch:
cms-v2-review-requests

THIS IS THE NEXT MAJOR REVIEWS STEP

Completed Service
-> Generate secure review link in CMS
-> Copy link OR open a prefilled email from CMS
-> Customer opens branded review page
-> Customer submits 1-5 stars + review
-> Review is created as DRAFT in CMS
-> Tabb reviews it and chooses when to Publish
-> Published review automatically appears on the website

============================================================
ARCHITECTURE DECISION
============================================================

This slice does NOT add a third-party transactional email provider yet.

The CMS "Email Review Request" button opens the user's normal email application
with the customer's address, subject, message, and secure review link already
filled in.

Why:
- no new vendor/API key yet
- no email deliverability/domain setup yet
- easy to test
- Tabb still sends the message herself
- secure review workflow can be proven before adding automation

Once this is stable, one-click server-side email delivery can be added with a
transactional provider without redesigning the review system.

============================================================
ADD
============================================================

cloudflare-worker/migrations/0007_create_review_requests.sql
cloudflare-worker/src/review-requests.js

admin/js/review-requests.js

review.html
public-review-form.js

============================================================
D1
============================================================

Run:

cloudflare-worker/migrations/0007_create_review_requests.sql

The table stores ONLY a SHA-256 hash of the secure token.
The actual token is returned once when the review link is generated.

Review links expire after 30 days.

Generating a new link for the same Service revokes any previous pending link.

============================================================
WORKER index.js
============================================================

1. Add INDEX-IMPORT.js.txt with the other imports.

2. Add INDEX-PUBLIC-ROUTE.js.txt BEFORE Cloudflare Access JWT authentication.

Recommended public ordering:

- public cleaning request
- public reviews list
- public review request
- THEN authentication

3. Add INDEX-ADMIN-ROUTE.js.txt AFTER Access authentication and allowed-admin
   email validation.

Then deploy the Worker.

============================================================
CLOUDFLARE ROUTING
============================================================

Add Worker route:

www.tidybytabb.com/api/review*

Point it to:
tidy-by-tabb-admin-gateway

============================================================
CLOUDFLARE ACCESS
============================================================

Create a PUBLIC Access application for:

www.tidybytabb.com/api/review/*

Policy:
Action: Bypass
Include: Everyone

Do NOT expose:
/admin/api/review-requests

That remains behind the existing Admin Access application.

============================================================
ADMIN CMS
============================================================

Add to admin/index.html AFTER reviews-cms.js:

<script src="js/review-requests.js?v=20260812-1"></script>

This adds a "Request Review" button to Reviews.

The modal:
- loads Completed Services
- generates a secure 30-day link
- displays Copy Link
- displays Email Review Request
- shows recent request status history

A Service must be Completed before it can receive a review request.

A Service that already has a Review cannot receive another request.

============================================================
PUBLIC REVIEW PAGE
============================================================

review.html is a public GitHub Pages page.

Example generated URL:

https://www.tidybytabb.com/review.html?token=<secure-token>

The token is validated through:

GET /api/review/<token>

Submission uses:

POST /api/review/<token>

The public API never exposes:
- customer email
- customer phone
- client ID
- service ID
- internal notes
- review request database ID

============================================================
REVIEW SUBMISSION
============================================================

Customer submits:
- display name
- 1-5 rating
- review text

The resulting Review is created with:

status = draft
client_id = linked client
service_id = linked completed service
source = NULL

It does NOT immediately appear on the public website.

Tabb publishes it from:
CMS -> Reviews

============================================================
TEST
============================================================

1. Run migration.
2. Deploy Worker.
3. Add Worker route /api/review*
4. Add public Access application /api/review/*
5. Upload review.html and public-review-form.js.
6. Add admin/js/review-requests.js and script tag.
7. Hard refresh CMS.

TEST SERVICE

8. Pick a completed Service that has a Client with email.
9. CMS -> Reviews -> Request Review.
10. Select the completed Service.
11. Click Generate Review Link.
12. Copy Link.
13. Open link in an incognito/private browser.
14. Confirm:
    - review page loads
    - customer display name is prefilled
    - service type is mentioned
15. Submit 5 stars + test review.
16. Confirm thank-you screen.
17. Try the same link again.
18. Confirm it says the request has already been completed.
19. CMS -> Reviews.
20. Confirm the new review appears as Draft.
21. Edit it if needed.
22. Change to Published.
23. Refresh public homepage.
24. Confirm the review appears.

EMAIL TEST

25. Generate a request for another completed service.
26. Click Email Review Request.
27. Confirm the email application opens with:
    - customer email
    - subject
    - message
    - secure review URL

============================================================
SECURITY NOTES
============================================================

- review token is cryptographically random
- D1 stores token hash only
- links expire after 30 days
- link is single-use
- duplicate review per service is blocked
- submission becomes Draft, not Published
- Admin generation endpoint remains authenticated

============================================================
COMMIT MESSAGE
============================================================

Add secure customer review request workflow
