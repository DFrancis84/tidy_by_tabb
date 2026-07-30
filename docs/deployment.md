# Deployment

From `cloudflare-worker/`, run:

```sh
npm install
npm run check
npm run db:migrate:local
npm run dev
npm run db:migrate:remote
npm run deploy
```

Keep `APPS_SCRIPT_URL`, `TEAM_DOMAIN`, `POLICY_AUD`,
`APPS_SCRIPT_SHARED_SECRET`, and `ALLOWED_ADMIN_EMAILS` as Worker secrets.

Apply the remote migration before deploying the Worker. Then verify Client and
Service CRUD plus existing Gallery create, update, delete, and upload actions.
The migration is additive and does not alter Gallery data.
