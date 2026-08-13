TIDY BY TABB - PUBLIC REVIEWS + CMS DEVELOPER BUTTON CLEANUP

Suggested branch:
cms-v2-public-reviews

WHAT THIS DOES

1. Published Reviews from the CMS automatically appear on the public website.
2. Draft and Hidden reviews are NEVER returned by the public API.
3. The public Reviews section shows:
   - rating
   - review text
   - reviewer display name
   - source
   - review month/year
   - published review count
   - average published rating
4. The Developer button and Developer panel are removed from the visible CMS UI.

NO D1 MIGRATION.

============================================================
FILES TO ADD
============================================================

public-reviews.js
cloudflare-worker/src/public-reviews.js

============================================================
FILES TO REPLACE
============================================================

index.html
admin/js/reviews-cms.js

============================================================
WORKER index.js
============================================================

Add the import from:

INDEX-IMPORT.js.txt

near the other imports at the top of:

cloudflare-worker/src/index.js

Then add the public route from:

INDEX-PUBLIC-ROUTE.js.txt

IMMEDIATELY AFTER:

const url = new URL(request.url);

and before the Cloudflare Access JWT is required.

A safe ordering is:

const url = new URL(request.url);

if (isPublicCleaningRequest(request, url)) {
  ...
}

if (isPublicReviewsRequest(request, url)) {
  ...
}

const jwt = request.headers.get("Cf-Access-Jwt-Assertion");

Then deploy the Worker.

============================================================
CLOUDFLARE ACCESS
============================================================

The new public endpoint is:

/api/reviews

It must be publicly reachable, just like the existing:

/api/cleaning-requests

Add the same exact public Bypass / Everyone treatment for:

https://www.tidybytabb.com/api/reviews

Do NOT make /admin/api/reviews public.

Only /api/reviews is public.

============================================================
PUBLIC API SECURITY
============================================================

The public endpoint intentionally returns ONLY:

reviewerName
rating
reviewText
source
reviewDate

It does NOT return:

review IDs
client IDs
service IDs
client contact information
internal audit fields
draft reviews
hidden reviews

============================================================
CMS DEVELOPER BUTTON
============================================================

admin/js/reviews-cms.js now hides:

#developerToggle
#developerPanel

on every CMS load.

The old developer diagnostics code remains untouched in this slice so there is
zero risk to Gallery / Client / Service API callbacks. The UI is completely
removed from normal use.

A later shell-cleanup refactor can delete the unused diagnostics module itself.

============================================================
TEST
============================================================

1. CMS -> Reviews.
2. Create or edit one review:
   - 5 stars
   - status Published
3. Open the public website.
4. Click Reviews.
5. Confirm the review appears.
6. Confirm the average rating and published count appear.
7. Change that review to Draft in the CMS.
8. Refresh the public website.
9. Confirm the review disappears.
10. Change it back to Published.
11. Confirm it returns.
12. Set a review to Hidden.
13. Confirm it does not appear publicly.
14. Open the CMS and confirm the Developer button is gone.

============================================================
ROLLBACK
============================================================

Restore the previous index.html and reviews-cms.js, remove the public Reviews
route from Worker index.js, and remove public-reviews.js files.

============================================================
COMMIT MESSAGE
============================================================

Publish CMS reviews to website
