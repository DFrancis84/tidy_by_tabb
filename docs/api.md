# API

All endpoints require Cloudflare Access and an email in
`ALLOWED_ADMIN_EMAILS`. JSON fields use camelCase.

## Clients

- `GET /api/clients?search=&limit=50&offset=0`
- `GET /api/clients/:id`
- `POST /api/clients`
- `PATCH /api/clients/:id`
- `DELETE /api/clients/:id`

Client fields: `firstName`, `lastName`, `email`, `phone`, `addressLine1`,
`addressLine2`, `city`, `state`, `postalCode`, and `notes`.

## Services

- `GET /api/services?clientId=&status=&limit=50&offset=0`
- `GET /api/services/:id`
- `POST /api/services`
- `PATCH /api/services/:id`
- `DELETE /api/services/:id`

Service fields: `clientId`, `serviceType`, `status`, `scheduledStart`,
`scheduledEnd`, `completedAt`, `priceCents`, and `notes`. Valid statuses are
`scheduled`, `in_progress`, `completed`, and `cancelled`.

PATCH and DELETE require the latest `version`. Stale writes return 409.
Successful deletes return 204.
