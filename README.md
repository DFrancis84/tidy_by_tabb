# Client UI cache fix

Replace these four files in your repository:

- `admin/js/script.js`
- `admin/js/ui.js`
- `admin/js/client-api.js`
- `admin/js/clients.js`

The replacement `script.js` imports every module with cache version `20260803-3`.
No manual code editing is required.

After replacing the files:

```bash
git add admin/js
git commit -m "Fix client UI module loading"
git push
```

Merge the fix to `main`, wait for GitHub Pages to publish, and refresh the admin page.
