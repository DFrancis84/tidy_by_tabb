# Client State Dropdown

Replace:

- `admin/js/client-drawer.js`

This changes the State field from free text to a dropdown containing all 50 U.S. states plus Washington, DC, using the standard two-letter abbreviation as the saved value.

Recommended branch:

```bash
git checkout main
git pull
git checkout -b cms-v2-client-ui-state-dropdown
```

Then:

```bash
git add admin/js/client-drawer.js
git commit -m "Use state abbreviation dropdown for clients"
git push -u origin cms-v2-client-ui-state-dropdown
```

Merge to `main`, wait for GitHub Pages, and test the Add Client drawer.
