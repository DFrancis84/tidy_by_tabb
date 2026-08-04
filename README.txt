TIDY BY TABB SERVICE CREATE UI

Branch:
cms-v2-service-ui-create

UPLOAD OR REPLACE THESE FILES IN GITHUB

Replace:
- admin/js/script.js
- admin/js/service-api.js
- admin/js/services.js
- admin/css/services.css

Add:
- admin/js/service-drawer.js

admin/js/ui.js is included as a full replacement so all package files
remain aligned, although its behavior is unchanged.

IMPORTANT VERSION UPDATE IN admin/index.html

Change the Services stylesheet reference to:

<link rel="stylesheet" href="css/services.css?v=20260804-2">

Change the bottom module script reference to:

<script type="module" src="js/script.js?v=20260804-2"></script>

No PowerShell, shell, or executable helper files are included.

COMMIT MESSAGE

Add service create UI

MERGE AND LIVE TEST

1. Merge the branch into main.
2. Wait for GitHub Pages.
3. Open CMS > Services.
4. Click Add service.
5. Select an active client.
6. Enter a service type, schedule, status, price, and notes.
7. Save.
8. Confirm the drawer closes and the service appears in the list.
9. Confirm the row shows client, type, schedule, status, and price.
10. Confirm the row exists in D1.
11. Confirm the appropriate status filter shows the record.
12. Confirm attempting the exact same service again returns the
    duplicate-protection error rather than creating a second row.
13. Regression test Clients and Add Transformation.
