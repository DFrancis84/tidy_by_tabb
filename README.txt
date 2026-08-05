TIDY BY TABB SERVICE ADD-ONS ONLY

This package removes automatic price calculation.

KEPT:
- Manual price entry
- Service type dropdown
- Multiple add-on selection
- Developer button overlap fix
- Scheduled end removed

UPLOAD OR REPLACE:
- admin/js/script.js
- admin/js/service-drawer.js
- admin/js/service-api.js
- admin/js/services.js
- admin/js/ui.js
- admin/css/services.css

ADD:
- admin/config/service-options.json

DELETE IF PRESENT:
- admin/config/service-pricing.json

UPDATE admin/index.html:

<link rel="stylesheet" href="css/services.css?v=20260804-4">

<script type="module" src="js/script.js?v=20260804-4"></script>

COMMIT MESSAGE:
Keep manual pricing and service add-ons

LIVE TEST:
1. Open Add service.
2. Confirm Developer hides.
3. Confirm Scheduled end is gone.
4. Confirm Service type dropdown loads.
5. Confirm multiple add-ons can be selected.
6. Confirm price is manual only.
7. Save and confirm add-ons are stored in notes under [Add-ons].
