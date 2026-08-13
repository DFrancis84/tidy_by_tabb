TIDY BY TABB - ONE-CLICK REVIEW EMAIL VIA RESEND

Suggested branch:
cms-v2-review-email-send

PREREQUISITES
- tidybytabb.com Verified in Resend
- RESEND_API_KEY already stored as a Cloudflare Worker secret
- review request migrations through 0008 already applied

1. RUN D1 MIGRATION
cloudflare-worker/migrations/0009_add_review_email_tracking.sql

Adds to review_requests and generic_review_requests:
- email_sent_at
- email_sent_to
- email_send_count
- email_provider_id

2. ADD WORKER MODULE
cloudflare-worker/src/review-email.js

3. UPDATE cloudflare-worker/src/index.js
Add INDEX-IMPORT.js.txt near the existing review imports.

Add INDEX-ADMIN-ROUTE.js.txt AFTER:
- Access JWT verification
- actorEmail resolution
- ALLOWED_ADMIN_EMAILS validation

A clean location is immediately before the existing
isAdminReviewRequestsRoute(...) block.

4. DEPLOY WORKER

No new Worker route.
No new Access application.
No additional Resend secret.

5. REPLACE ADMIN FILES
admin/js/service-review-request.js
admin/js/generic-review-request.js

6. BUMP admin/index.html cache versions
Recommended:
service-review-request.js?v=20260813-1
generic-review-request.js?v=20260813-1

BEHAVIOR
Completed Service:
Generate Review Link -> Send Review Email -> Email Sent ✓

Generic Review:
Enter email/name -> Generate Review Link -> Send Review Email -> Email Sent ✓

SECURITY
- RESEND_API_KEY never reaches the browser.
- Recipient is loaded from D1.
- Submitted reviewUrl must be the expected tidybytabb.com review URL.
- Token from the URL is hashed and compared to the D1 token_hash before send.
- Request must still be pending and unexpired.
- Resend Idempotency-Key is used for send attempts.

SENDER
Tidy by Tabb <reviews@tidybytabb.com>

OPTIONAL REPLY-TO
If you later want customer replies routed to a real inbox, add Worker variable:
REVIEW_REPLY_TO=<real mailbox>

The module automatically includes reply_to when it is configured.

IMPORTANT TOKEN NOTE
The plaintext review token is still NOT stored in D1.
The one-click send works immediately after link generation.
If an old secure link is lost, generate a new request rather than storing bearer tokens.

TEST
1. Merge/deploy.
2. Hard refresh CMS.
3. Open Completed Service.
4. Generate fresh link.
5. Click Send Review Email.
6. Confirm Email Sent ✓.
7. Confirm email appears in Resend Emails/Logs.
8. Confirm recipient receives it.
9. Open the review from the email.
10. Submit and verify the normal Draft -> Publish workflow.

Then test Generic Review Link the same way.

COMMIT MESSAGE
Add one-click Resend review emails
