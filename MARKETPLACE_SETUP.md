# Gtech Global Digital Marketplace

## Environment variables (backend)

Required for full marketplace operation:

```
PAYSTACK_SECRET_KEY=sk_test_...          # Gtech Global Paystack secret key
PAYSTACK_WEBHOOK_SECRET=...              # Webhook signing secret from Paystack dashboard
PIN_ENCRYPTION_KEY=...                   # Strong secret for AES-256-GCM PIN encryption
MARKETPLACE_PUBLIC_URL=https://...       # Public URL of this site (for school launch links)
```

Optional:

```
CORS_ORIGIN=https://your-frontend-domain
```

## Initial setup

1. Log into `/admin` and open the **Marketplace** tab, then click **Open Marketplace Admin**.
2. Create a product category and a `DIGITAL_PIN` product (e.g. "School Result Checking PIN").
3. Generate a PIN batch via **PIN Inventory > Generate batch**.
4. Create a school integration under **School Integrations** and copy the API key to the school deployment's backend environment as `GTECH_MARKETPLACE_API_KEY`.

## School integration API

School deployments authenticate with header `x-school-api-key` (server-to-server only):

- `POST /api/marketplace/school/launch-token` — body `{ adminUserId, adminName, returnUrl }`, returns one-time 10-minute token + URL.
- `GET /api/marketplace/school/order/:ref` — order status.
- `GET /api/marketplace/school/orders` — all school orders.
- `POST /api/marketplace/school/sync-orders` — body `{ references: [] }`.
- `POST /api/marketplace/verify-pin` — body `{ pin, session, schoolId, regNo, term }`, verifies through the central PIN engine.
- `GET /api/marketplace/school/health` — health check.

## Paystack webhook

Set the webhook URL to `https://your-domain/api/marketplace/payment/webhook`. The endpoint verifies the `x-paystack-signature` header against `PAYSTACK_WEBHOOK_SECRET` and processes `charge.success` idempotently.

## PIN rules

- PINs are universal — never locked to the purchasing school.
- Default usage: 3 successful checks per academic session (configurable per product).
- Invalid attempts, failed verification and unavailable results never consume usage.
- Atomic usage updates prevent concurrent over-use.
- PINs are stored as SHA-256 hashes plus AES-256-GCM encrypted codes for secure delivery. Plaintext codes are never logged.
