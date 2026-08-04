TIDY BY TABB SERVICES LIST UI

Branch: cms-v2-ervice-ui-list

The missing "s" in the branch name is harmless. Keep using the branch
you already created.

UPLOAD OR REPLACE THESE FILES IN GITHUB

Replace:
- admin/js/script.js
- admin/js/ui.js

Add:
- admin/js/service-api.js
- admin/js/services.js
- admin/css/services.css

THREE SMALL EDITS TO admin/index.html

1. Add this immediately after the Clients sidebar button:

<button class="nav-item" data-view="services">Services</button>

2. Copy SERVICES-SECTION.html after the complete Clients section and
   before the Gallery section.

3. In <head>, after clients.css, add:

<link rel="stylesheet" href="css/services.css?v=20260804-1">

At the bottom, change the script reference to:

<script type="module" src="js/script.js?v=20260804-1"></script>

Commit message:
Add services list UI

Merge into main, wait for GitHub Pages, then test live.

TEST
- Services appears in the sidebar.
- Opening Services loads D1 services.
- Status filters work.
- Clients CRUD still works.
- Add Transformation still works.
- Add Service and View intentionally show placeholders for now.
