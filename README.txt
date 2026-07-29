Tidy by Tabb - Gallery V5 True Mobile Fix
===========================================

Replace the root-level script.js in the repository with the included script.js.

The repository's index.html is already using:
<script src="script.js?v=6"></script>

Changes:
- Forces the gallery dialog to use content-sized height on iOS/Safari.
- Overrides the old full-screen mobile .gallery-modal height.
- Makes the modal wrap the heading, image, and footer instead of stretching.
- Keeps portrait/landscape aspect-ratio detection.
- Reduces the mobile sponge handle to 40px.
- Reduces the mobile divider to 3px.
- Preserves the gallery wipe, nudge, touch controls, keyboard controls,
  navigation, pricing coverflow, accessibility toggle, document modals,
  and social controls.

Suggested commit message:
fix: make mobile gallery modal wrap image content
