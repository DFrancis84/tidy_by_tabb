TIDY BY TABB - REVIEW THANK-YOU AUTO CLOSE

Suggested branch:
cms-v2-review-auto-close

REPLACE

public-review-form.js

UPDATE review.html

Change:

<script src="public-review-form.js?v=20260812-2"></script>

to:

<script src="public-review-form.js?v=20260812-3"></script>

BEHAVIOR

After a successful review submission:

1. Review form disappears.
2. Thank-you confirmation is shown.
3. Message says the page will close automatically.
4. Confirmation remains visible for 3 seconds.
5. The page attempts window.close().
6. If the browser blocks automatic tab/window closing, the page redirects
   to https://www.tidybytabb.com/ instead.

This works for BOTH:
- service-linked review requests
- generic review requests

NO WORKER CHANGE.
NO D1 CHANGE.
NO CLOUDFLARE CHANGE.

TEST

1. Generate a fresh review request.
2. Open the review URL.
3. Submit a test review.
4. Confirm Thank You remains visible for about 3 seconds.
5. Confirm the tab closes when browser rules allow it.
6. If the browser blocks closing, confirm it returns to the Tidy by Tabb homepage.

COMMIT MESSAGE

Auto close review page after submission
