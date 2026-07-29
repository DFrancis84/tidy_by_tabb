Tidy by Tabb - Gallery V7 Final Polish
====================================

Replace the root-level script.js with the included script.js.

Changes
-------
- Locks Before and After badges to identical dimensions.
- Uses perfectly mirrored left/right offsets.
- Keeps SVG navigation chevrons mathematically centered.
- Removes iOS button appearance drift.
- Nudges only the sponge emoji upward by 2px.
- Reduces the divider from 4px to 3px.
- Preserves mobile sizing, wipe animation, touch, keyboard, navigation,
  accessibility, document modals, pricing controls, and social controls.

Also update index.html:
<script src="script.js?v=8"></script>

Suggested commit message:
fix: finalize gallery alignment and control centering
