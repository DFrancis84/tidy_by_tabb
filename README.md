# Tidy by Tabb Client Detail + Edit UI

Replace these files:

- `admin/js/script.js`
- `admin/js/client-api.js`
- `admin/js/client-drawer.js`
- `admin/css/clients.css`

The module version is `20260803-6`.

## What this adds

- View button loads `GET /admin/api/clients/:id`
- Existing data populates the Client drawer
- Save changes sends `PATCH /admin/api/clients/:id`
- The current `version` is included for optimistic concurrency
- Empty optional fields are sent as `null`, so values can be cleared
- State remains a controlled abbreviation dropdown
- The Client list refreshes after a successful update
- Create Client continues to work in the same drawer

## Commit and merge

```bash
git add admin
git commit -m "Add client detail and edit UI"
git push
```

Merge into `main`, wait for GitHub Pages, then test live.

## Live test

1. Open Clients and click View.
2. Confirm all existing fields load.
3. Change phone, city, state, or notes and save.
4. Confirm the drawer closes and the list refreshes.
5. Reopen the client and confirm changes persisted.
6. Clear an optional value and confirm it saves as blank.
7. Keep one drawer open in two tabs, save tab one, then save tab two. Tab two should receive a stale-version error.
8. Confirm Add Client and Add Transformation still work.
