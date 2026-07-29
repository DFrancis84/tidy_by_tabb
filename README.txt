Tidy by Tabb - Gallery V4 Mobile Orientation Fix
=================================================

Replace the existing root-level script.js with the included script.js.

Changes in V4
-------------
- Fixes the mobile modal retaining a tall portrait-shaped height.
- Landscape uploads now create a short, wide comparison area on mobile.
- Portrait uploads remain tall and properly fitted.
- The modal now wraps the image stage instead of inheriting a fixed height.
- Slightly reduces the mobile sponge circle from 48px to 44px.
- Softens the sponge glow.
- Adds one subtle left/right nudge after the first wipe animation to show that
  the sponge can be dragged. It only runs once per page load.
- Keeps mouse, touch, keyboard, Escape, and previous/next controls.

Upload guideline
----------------
Each Before/After pair should use matching dimensions and orientation.

Suggested commit message
------------------------
fix: improve mobile gallery orientation and sponge control
