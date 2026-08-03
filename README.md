# Tidy by Tabb Client UI List Package

This package contains complete replacements for:

- `admin/js/script.js`
- `admin/js/ui.js`

And new files to add:

- `admin/js/client-api.js`
- `admin/js/clients.js`
- `admin/css/clients.css`

## Small `admin/index.html` edits

### 1. Add the stylesheet

Immediately after:

```html
<link rel="stylesheet" href="css/styles.css">
```

add:

```html
<link rel="stylesheet" href="css/clients.css">
```

### 2. Sidebar

Add this button after Dashboard:

```html
<button class="nav-item" data-view="clients">Clients</button>
```

Change the footer text to:

```text
Cloudflare + Google backend
```

### 3. Top-right action button

Replace the existing `addTransformation` button with:

```html
<button
  id="primaryAction"
  class="button button-primary"
  type="button"
  hidden
>
  Add
</button>
```

### 4. Client view

Copy the contents of `CLIENTS-SECTION.html` immediately after the Dashboard section and before the Gallery section.

## Result

- Clients load only after the Clients tab is opened.
- Search waits 300ms while typing.
- Pagination uses 25 clients per page.
- Add Client and View buttons are placeholders for the next UI branches.
- Existing Gallery behavior remains intact.
