Tidy by Tabb - Gallery V2
============================

This package contains one replacement file:

  script.js

What it changes
---------------
- Keeps the existing public Gallery button and modal.
- Rebuilds the modal at runtime as an interactive Before/After slider.
- Uses the original beforeImage and afterImage URLs from the Gallery API.
- Supports mouse dragging, touch dragging, keyboard slider control,
  previous/next navigation, Escape to close, and mobile layouts.
- Injects the required Gallery V2 CSS automatically, so index.html and
  style.css do not need to be edited.

Install
-------
1. Back up the current script.js.
2. Drag this script.js into the repository root.
3. Replace/overwrite the existing script.js.
4. Commit and push the change.
5. Hard-refresh the public site.

Important
---------
The API records must include both:
- beforeImage
- afterImage

Records missing either image are skipped by the slider.

Suggested commit message
------------------------
feat: add interactive before-after gallery slider
