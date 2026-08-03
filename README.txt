# Client Delete UI Safe Package

This ZIP contains only HTML-adjacent web assets and no executable scripts.

Replace these files in GitHub:

- admin/js/script.js
- admin/js/client-api.js
- admin/js/client-drawer.js
- admin/css/clients.css

Then manually update admin/index.html:

1. Change the clients stylesheet reference to:

   css/clients.css?v=20260803-7

2. Change the script reference to:

   js/script.js?v=20260803-7

Commit the files, merge into main, wait for GitHub Pages, then test live.
