TIDY BY TABB CLEANING REQUEST FORM DETAILS

Branch:
cms-v2-cleaning-request-form-details

FILES TO UPLOAD OR REPLACE

ADD:
cloudflare-worker/migrations/0005_add_cleaning_request_contact_details.sql

REPLACE:
cloudflare-worker/src/public-cleaning-requests.js
index.html
public-request-form.js

OPTIONAL:
VERIFY.sql

DEPLOYMENT ORDER

1. Upload all files to the branch.
2. Merge the pull request into main.
3. Apply migration 0005 to the production D1 database.
4. Deploy the updated Cloudflare Worker.
5. Wait for GitHub Pages to publish.
6. Test the live public form.

IMPORTANT

The Worker code expects the new D1 columns. Apply migration 0005 before
testing the updated form against the deployed Worker.

CHANGES

- Confirmation remains visible for 3 seconds, then the request modal
  closes automatically.
- State is now a controlled U.S. state dropdown.
- States are submitted and stored as two-letter codes such as KY.
- Preferred contact method is required:
  email, phone, or either.
- Choosing email requires an email address.
- Choosing phone requires a phone number.
- Adds optional referral source.
- Adds explicit, unchecked mailing-list consent.
- Mailing-list consent is stored as 0 or 1.
- Existing cleaning requests remain valid and default to no mailing-list
  consent.
- public-request-form.js asset version is bumped to 20260805-2.

D1 MIGRATION

From the Cloudflare dashboard, run the contents of:

cloudflare-worker/migrations/0005_add_cleaning_request_contact_details.sql

VERIFY

Run VERIFY.sql after migration and after submitting a live request.

LIVE TESTS

1. Submit with preferred contact = email but no email.
   Expect a validation error.

2. Submit with preferred contact = phone but no phone.
   Expect a validation error.

3. Submit with preferred contact = either and one valid contact method.
   Expect success.

4. Confirm state stores KY, not Kentucky.

5. Enter a referral source and confirm it is stored.

6. Leave mailing-list consent unchecked.
   Expect mailing_list_opt_in = 0.

7. Submit another request with consent checked.
   Expect mailing_list_opt_in = 1.

8. Confirm the success message appears and the modal closes after
   approximately 3 seconds.

CLOUDFLARE WORKER FILE

Because public-cleaning-requests.js is a Worker module, replace that
module in the Cloudflare web editor and deploy after the migration.

COMMIT MESSAGE

Add cleaning request contact details
