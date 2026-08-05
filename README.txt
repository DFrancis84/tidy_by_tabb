TIDY BY TABB SERVICE VIEW / EDIT UI

Branch:
cms-v2-service-ui-edit

UPLOAD OR REPLACE:
- admin/js/script.js
- admin/js/service-api.js
- admin/js/service-drawer.js
- admin/css/services.css
- admin/js/services.js
- admin/js/ui.js
- admin/config/service-options.json

UPDATE admin/index.html:
- services.css version: 20260804-6
- script.js version: 20260804-6

Commit message:
Add service view and edit UI

LIVE TEST:
1. Open Services.
2. Click View on an existing service.
3. Confirm client, service type, add-ons, status, schedule, price,
   and notes populate.
4. Change several fields and click Save changes.
5. Confirm the drawer closes and the list refreshes.
6. Reopen the service and confirm the changes persisted.
7. Confirm selected add-ons remain selected.
8. Confirm the notes box does not show the internal [Add-ons] block.
9. Test a stale version response by opening the same service in two
   tabs, saving in one, then saving in the other. The second should
   receive a concurrency error instead of overwriting the first.
10. Regression test Add service, Clients, and Gallery.
