# Tidy by Tabb admin mutation gateway

This Worker accepts only authenticated CMS mutation requests and forwards them
to the existing Google Apps Script web app. Public Gallery and read-only CMS
requests continue to call Apps Script directly.

## Required Cloudflare setup

1. Confirm the existing Cloudflare Access self-hosted application for `/admin`
   also covers `www.tidybytabb.com/admin/api*`. Keeping the gateway below the
   existing `/admin` path preserves the same Access session and email One-Time
   PIN login experience.
2. Keep the existing policy and allow only the two approved administrators.
3. Copy the Access application AUD tag for `POLICY_AUD`.
4. From this directory, authenticate Wrangler and set every runtime value as a
   secret. Do not put values in `wrangler.toml`:

   ```sh
   npx wrangler secret put APPS_SCRIPT_URL
   npx wrangler secret put TEAM_DOMAIN
   npx wrangler secret put POLICY_AUD
   npx wrangler secret put APPS_SCRIPT_SHARED_SECRET
   npx wrangler secret put ALLOWED_ADMIN_EMAILS
   ```

   `TEAM_DOMAIN` is the Access team hostname, for example
   `your-team.cloudflareaccess.com`. `ALLOWED_ADMIN_EMAILS` may be a
   comma-separated list. Generate a unique high-entropy shared secret; never
   reuse an administrator password or commit the value.

5. Deploy:

   ```sh
   npx wrangler deploy
   ```

6. Confirm the Worker route is active and the Access application protects it.
   The route is intentionally unavailable on `workers.dev`.

## Required Apps Script setup

In Apps Script, open **Project Settings → Script Properties** and add:

- Property: `APPS_SCRIPT_SHARED_SECRET`
- Value: exactly the same value stored in the Worker secret

Push the `apps-script/` source with `clasp`, then create a new web-app deployment
version. Keep the web app executable by anonymous users because public reads
still use it; mutation POSTs are protected by the server-side shared secret.

## Safe deployment order

1. Add the Apps Script Property without deploying the code change.
2. Configure Access, set Worker secrets, and deploy the Worker.
3. Deploy the updated admin frontend so mutations use `/admin/api`.
4. Push and redeploy Apps Script with gateway enforcement.
5. Test upload, create, update, delete, and optional Drive Trash cleanup as each
   approved administrator.
6. Verify a direct mutation POST to Apps Script now returns `success: false`.
7. Verify public `health` and Gallery `list` GET requests still work.

## Rollback

For a full rollback, restore the previous Apps Script deployment version and
the previous `admin/js/api.js`, then remove or disable the Worker route. Removing
only the Worker while the secured Apps Script version is active will break all
CMS mutations.

For a Worker-only rollback, deploy the prior Worker version in Cloudflare. Do
not remove the Apps Script Property unless the Apps Script code has also been
rolled back.
