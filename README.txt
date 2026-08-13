TIDY BY TABB - REVIEWS POLISH

Suggested branch:
cms-v2-reviews-polish

REPLACE

index.html
public-reviews.js
admin/js/reviews-cms.js

ADMIN CACHE BUMP

In admin/index.html change:

<script src="js/reviews-cms.js?v=20260812-1"></script>

to:

<script src="js/reviews-cms.js?v=20260812-2"></script>

WHAT CHANGED

PUBLIC REVIEWS
- A single review no longer stretches across the whole section.
- One review is capped at 640px and centered.
- Multiple reviews still expand into a responsive grid.
- Source is no longer shown publicly.
- Public copy no longer talks about the CMS.

CMS REVIEWS
- Source column removed.
- Source field removed from Add/Edit Review.
- Search placeholder no longer mentions Source.
- Backend/database source column is intentionally left alone for compatibility.
  Existing source values can remain in D1 without affecting the UI.

WHY WE ARE KEEPING THE DATABASE COLUMN FOR NOW

The next Reviews feature is the proper review-request workflow:

Client / completed Service
-> Generate secure review link
-> Send review request by email from CMS
-> Customer opens link
-> Customer submits rating + review
-> Review enters CMS for management/publishing

Once that flow is live, all new reviews have a known origin, so a manual Source
field is unnecessary. Leaving the old nullable column in the database costs
nothing and avoids a pointless migration right now.

NO WORKER CHANGE.
NO D1 CHANGE.
NO CLOUDFLARE CHANGE.

TEST

1. Merge and let GitHub Pages deploy.
2. Hard refresh the main site.
3. Open Reviews.
4. Confirm one review is centered and noticeably smaller.
5. Confirm only reviewer name + review date show under the review.
6. Open CMS -> Reviews.
7. Confirm Source is gone from:
   - table
   - Add Review
   - Edit Review
8. Confirm create/edit still work.

COMMIT MESSAGE

Polish reviews layout and remove source field
