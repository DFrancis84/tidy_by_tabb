TIDY BY TABB PUBLIC CLEANING REQUEST FORM

Branch:
cms-v2-cleaning-requests-public-form

UPLOAD OR REPLACE:
- index.html
- public-request-form.js

WHAT CHANGES

- Replaces the embedded Google Form with a native Tidy by Tabb form
- Submits to POST /api/cleaning-requests
- Captures contact information, address, service details, add-ons,
  property details, access notes, pets, and customer notes
- Requires at least an email address or phone number
- Shows an in-form success or error message
- Prevents duplicate clicks while submitting
- Keeps the appointment language clear: this is a request, not a
  confirmed booking
- Preserves the existing homepage layout and controls
- Adds responsive styling directly to index.html
- Loads public-request-form.js with version 20260805-1

LIVE TEST

1. Open Submit Cleaning Request.
2. Confirm the Google Form iframe is gone.
3. Submit without email and phone.
4. Confirm the form asks for at least one contact method.
5. Submit a new customer.
6. Confirm the success message appears.
7. Confirm a new client and cleaning_requests row exist in D1.
8. Submit the same customer again.
9. Confirm no duplicate client is created.
10. Test on a phone-sized screen.

D1 CHECK

SELECT
  id,
  client_id,
  submitted_first_name,
  submitted_last_name,
  submitted_email,
  submitted_phone,
  requested_service_type,
  requested_add_ons,
  match_status,
  status,
  created_at
FROM cleaning_requests
ORDER BY created_at DESC;

COMMIT MESSAGE

Connect public cleaning request form
