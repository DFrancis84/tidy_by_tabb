Tidy by Tabb - Gallery V10 Clean Comparison
=============================================

Files included
--------------
script.js
admin/js/composer.js
ADMIN_INDEX_CHANGES.txt

Public gallery changes
----------------------
- Removes the Before and After overlay badges entirely.
- Keeps the sponge, divider, wipe animation, touch controls, keyboard controls,
  responsive sizing, navigation, title, and category.
- Removes unused badge CSS and visibility logic.

Admin image generator changes
-----------------------------
- Removes the baked-in Before and After header strip.
- Uses the full image area for the two photos.
- Keeps a clean center divider.
- Keeps the branded footer.
- Produces a more reusable comparison image for the website and social media.

Installation
------------
1. Replace root-level script.js.
2. Replace admin/js/composer.js.
3. Apply the small text changes listed in ADMIN_INDEX_CHANGES.txt.
4. Update the public script cache version in index.html:

   <script src="script.js?v=11"></script>

5. Because the admin uses ES modules, hard refresh the admin page after deployment.
   If needed, append a temporary query string to the admin URL, such as:
   /admin/?v=2

Suggested commit message
------------------------
feat: remove before after labels from gallery and comparison generator
