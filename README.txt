TIDY BY TABB - REVIEW WORKFLOW POLISH

Suggested branch:
cms-v2-review-workflow-polish

THIS UPDATE IMPLEMENTS ALL THREE REQUESTS

1. Review page now looks much closer to the public Tidy by Tabb website.
2. Service-linked Generate Review Link lives INSIDE a completed Service.
3. Reviews screen no longer uses the old completed-service picker.
   It now gets a GENERIC REVIEW LINK tool for one-off requests.

============================================================
1. PUBLIC REVIEW PAGE
============================================================

REPLACE:

review.html
public-review-form.js

The new page:
- uses the Tidy by Tabb logo
- uses pink/teal glass styling
- uses the same site stylesheet
- has branded trust chips
- retains the secure token flow
- works for both service-linked and generic review requests

============================================================
2. COMPLETED SERVICE REVIEW BUTTON
============================================================

ADD:

admin/js/service-review-request.js

Add to admin/index.html:

<script src="js/service-review-request.js?v=20260812-1"></script>

This enhancer watches Services.

When an EXISTING service is opened:
- Scheduled -> no review button
- In Progress -> no review button
- Cancelled -> no review button
- Completed -> Generate Review Link appears

The backend still validates that the service is actually Completed, so changing
the dropdown without saving does not create a review request.

Generated service review link can be:
- copied
- opened in a prefilled email to the linked Client

============================================================
3. GENERIC REVIEW LINK
============================================================

RUN MIGRATION:

cloudflare-worker/migrations/0008_create_generic_review_requests.sql

ADD WORKER MODULE:

cloudflare-worker/src/generic-review-requests.js

Add INDEX-IMPORT.js.txt.

Add INDEX-PUBLIC-ROUTE.js.txt BEFORE the normal
isPublicReviewRequestRoute() handler.

This ordering matters because:

/api/review/generic/<token>

also starts with:

/api/review/

The generic route must get first shot.

Add INDEX-ADMIN-ROUTE.js.txt after authentication / allowed admin email,
before or near the existing authenticated Review Request route.

DEPLOY WORKER.

NO NEW CLOUDFLARE WORKER ROUTE IS REQUIRED.

Your existing:

www.tidybytabb.com/api/review*

already covers:

/api/review/generic/<token>

Your existing public Access application for:

www.tidybytabb.com/api/review/*

also covers it.

============================================================
4. REVIEWS SCREEN
============================================================

REMOVE OLD SCRIPT TAG:

<script src="js/review-requests.js?v=20260812-1"></script>

The file can remain in the repo temporarily, but it will no longer be loaded.

ADD:

admin/js/generic-review-request.js

Add to admin/index.html:

<script src="js/generic-review-request.js?v=20260812-1"></script>

The Reviews screen now gets:

Generic Review Link

Click it and enter:
- Email address (required)
- Name (optional)

Then:
- Generate Review Link
- Copy Link
- Email Review Request

Generic customer submissions become Draft reviews with:
- no client_id
- no service_id
- source NULL

Tabb can still edit and publish them from Reviews.

============================================================
RECOMMENDED ADMIN SCRIPT ORDER
============================================================

<script src="js/reviews-cms.js?v=20260812-2"></script>
<script src="js/service-review-request.js?v=20260812-1"></script>
<script src="js/generic-review-request.js?v=20260812-1"></script>

Do NOT load the old review-requests.js script after this update.

============================================================
TEST SERVICE-LINKED FLOW
============================================================

1. Open Scheduled Service.
2. Confirm NO Generate Review Link button.
3. Open Completed Service.
4. Confirm Generate Review Link appears.
5. Generate it.
6. Copy and open it privately.
7. Submit review.
8. Confirm Review appears in CMS as Draft.
9. Publish and confirm homepage display.

============================================================
TEST GENERIC FLOW
============================================================

1. CMS -> Reviews.
2. Click Generic Review Link.
3. Enter an email address.
4. Optionally enter a name.
5. Generate.
6. Open link privately.
7. Confirm branded review page loads.
8. Submit review.
9. Confirm it arrives in CMS as Draft.
10. Publish it if desired.

============================================================
WHY THIS STRUCTURE
============================================================

Service review requests belong to Services because they are earned by a
specific completed job.

Generic Review Link belongs to Reviews because it is not tied to operational
service history.

That keeps the normal workflow contextual while still giving Tabb an escape
hatch for reviews from people not represented by a completed Service record.

============================================================
COMMIT MESSAGE
============================================================

Move review requests into Services and add generic links
