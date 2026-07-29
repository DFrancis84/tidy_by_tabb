TIDY BY TABB GALLERY v2.1

WHAT IS INCLUDED
- admin/        Complete replacement frontend
- apps-script/  Complete replacement Apps Script backend

FEATURES
- Mobile horizontal-overflow fix
- Direct Before and After photo upload from phone/camera
- Google Drive image storage
- Compact image previews
- Branded combined Before/After image generator
- Save generated comparison image to Drive
- Existing create/edit/publish/Gallery visibility/delete behavior

INSTALLATION

1. APPS SCRIPT
   Replace the matching Apps Script files with the files in apps-script/.
   Add the new MediaService.gs file.
   Run setupCms() once from the Apps Script editor.
   Approve the new Google Drive permissions.
   Redeploy the web app as a NEW VERSION.

2. FRONTEND
   Replace the entire admin frontend with the admin/ folder.
   Open admin/js/api.js and preserve/set your deployed Apps Script /exec URL.

3. TEST
   - Open Add transformation
   - Choose a Before photo
   - Choose an After photo
   - Click Create combined photo
   - Click Save combined photo
   - Save the transformation
   - Refresh and verify all three images remain

IMPORTANT
The Apps Script tries to set uploaded files to "Anyone with the link".
Some Google Workspace organizations block public link sharing. If images upload
but do not display, open the upload folder in Drive and verify sharing policy.
