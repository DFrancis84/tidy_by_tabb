TIDY BY TABB ADMIN REQUESTS ROUTE FIX

This package removes the actorEmail confusion.

FILES

1. cloudflare-worker/src/cleaning-requests-admin.js
   Add or replace this Worker module.

2. INDEX-IMPORT.js.txt
   Copy this import to the very top of the main Worker index.js,
   immediately after the existing public-cleaning-requests import.

3. INDEX-AUTHENTICATED-ROUTE.js.txt
   Copy this route block into the main Worker index.js.

EXACT PLACEMENT

Inside export default > async fetch(request, env), find this existing
admin authentication block:

      const claims = await verifyAccessJwt(jwt, env);
      const actorEmail = normalizeEmail(claims.email);

      if (!actorEmail) {
        throw new HttpError(
          401,
          "Authenticated email is required."
        );
      }

      const allowedEmails = parseAllowedEmails(
        env.ALLOWED_ADMIN_EMAILS
      );

      if (!allowedEmails.has(actorEmail)) {
        throw new HttpError(
          403,
          "Administrator access is denied."
        );
      }

Paste INDEX-AUTHENTICATED-ROUTE.js.txt IMMEDIATELY AFTER that block.

The order must be:

1. Origin validation
2. Public cleaning request route
3. Cloudflare Access JWT validation
4. actorEmail creation
5. Allowed-admin-email validation
6. Cleaning Requests admin route
7. Existing health, reviews, services, clients, and gallery routes

IMPORTANT

Delete any earlier copy of the Cleaning Requests admin route before
pasting the corrected block. There should be exactly one call to:

handleCleaningRequestsAdminRoute

The import does not count as a call.

WHY IT FAILED

The prior route block was placed where actorEmail was not available.
This route is an administrator route, so it must run after Cloudflare
Access authentication creates actorEmail.

DEPLOY

1. Replace/add cleaning-requests-admin.js in Cloudflare.
2. Fix index.js using the two supplied text files.
3. Deploy the Worker.
4. Open /admin/requests.html.

No D1 migration is required.

COMMIT MESSAGE

Fix authenticated cleaning requests route
