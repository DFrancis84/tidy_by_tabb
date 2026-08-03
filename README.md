# Tidy by Tabb Client Create UI

Replace/add these files exactly:

- Replace `admin/js/script.js`
- Replace `admin/js/client-api.js`
- Replace `admin/js/clients.js`
- Replace `admin/css/clients.css`
- Add `admin/js/client-drawer.js`

No `index.html` changes are required. The Client drawer injects its own markup.

The module version is `20260803-4` to avoid the stale-cache issue from the prior slice.

## Commit and merge

```bash
git add admin
git commit -m "Add client creation UI"
git push
```

Open the PR, merge it into `main`, wait for GitHub Pages, then test live.

## Live test

1. Open Clients.
2. Click Add client.
3. Submit only first and last name.
4. Confirm the drawer closes and the new client appears.
5. Create another client with email, phone, address, and notes.
6. Confirm invalid email is blocked.
7. Confirm a possible duplicate shows the API error without closing the drawer.
8. Confirm Add Transformation still opens the Gallery drawer.
