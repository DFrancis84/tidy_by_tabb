TIDY BY TABB CMS REQUESTS LINK

GOAL

Add a Requests item to the existing CMS sidebar. Clicking it opens
admin/requests.html. The Requests page already has a Back to CMS button.

FILES IN THIS PACKAGE

NAVIGATION-LINK.html
STYLES-ADD.css

ADMIN INDEX CHANGE

Open admin/index.html.

Inside:

<nav class="sidebar-nav">

Paste NAVIGATION-LINK.html immediately after the Services button:

<button class="nav-item" data-view="services">Services</button>

The finished area should look like:

<button class="nav-item" data-view="dashboard">Dashboard</button>
<button class="nav-item" data-view="clients">Clients</button>
<button class="nav-item" data-view="services">Services</button>
<a class="nav-item nav-link" href="requests.html">
  Requests
</a>
<button class="nav-item" data-view="gallery">Gallery</button>

ADMIN CSS CHANGE

Open admin/css/styles.css and paste STYLES-ADD.css at the bottom.

REQUESTS PAGE

admin/requests.html already contains:

Back to CMS

which links to index.html.

DEPLOY

1. Update admin/index.html.
2. Update admin/css/styles.css.
3. Merge.
4. Wait for GitHub Pages.
5. Open /admin/.
6. Click Requests.
7. Confirm Back to CMS returns to /admin/index.html.

This change does not touch the Worker, D1, or the public homepage.

COMMIT MESSAGE

Add Requests link to CMS navigation
