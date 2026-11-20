# School Client Portal Setup

The school client system is built into the existing Gtech Global website. It shares the same React frontend, Express backend, MongoDB database, admin authentication, Paystack account and deployment entries as the main site and marketplace.

## Environment variables

Add these to `backend/.env` and the equivalent hosting environment variables:

```env
PAYSTACK_SECRET_KEY=sk_test_or_live_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret
SCHOOL_CLIENT_PUBLIC_URL=https://your-frontend-domain
MARKETPLACE_PUBLIC_URL=https://your-frontend-domain
PIN_ENCRYPTION_KEY=base64_32_byte_key
CORS_ORIGIN=https://your-frontend-domain
```

`PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` must remain server-side. Never expose them in frontend code.

## Paystack webhook

Configure the Paystack webhook URL as:

```text
https://your-api-domain/api/schools/payments/webhook
```

The webhook verifies the `x-paystack-signature` header against the raw request body before processing `charge.success` events. Duplicate event IDs are ignored, payment amounts are re-verified against Paystack, and receipts are created only after successful verification.

## Public routes

- `/school-management` — public school systems landing page
- `/school-management/apply` — official school application form
- `/proposal/:token` — client proposal review and response
- `/agreement/:token` — agreement review and acceptance
- `/invite/:token` — teacher or class information submission
- `/client-portal` — client login and project dashboard
- `/client-portal/onboarding` — full-page onboarding forms

## Admin routes

- `/admin/school-clients` — complete school client administration
- `/admin` → `School Clients` tab — shortcut to the dedicated admin portal
- `/admin/marketplace` — existing marketplace administration

## API routes

Public:

- `GET /api/schools/public/config`
- `POST /api/schools/public/applications`
- `POST /api/schools/public/client/login`
- `GET /api/schools/public/proposal/:token`
- `POST /api/schools/public/proposal/:token/respond`
- `GET /api/schools/public/agreement/:token`
- `POST /api/schools/public/agreement/:token/accept`
- `GET /api/schools/invite/:token`
- `POST /api/schools/invite/:token/submit`
- `POST /api/schools/payments/webhook`
- `POST /api/schools/payments/verify`

Admin (requires `Authorization: Bearer <admin token>`):

- `GET /api/schools/admin/overview`
- `GET/PATCH /api/schools/admin/applications`
- `POST /api/schools/admin/applications/:id/convert`
- `GET /api/schools/admin/clients`
- `POST /api/schools/admin/clients/:id/marketplace/connect`
- `POST /api/schools/admin/clients/:id/marketplace/rotate`
- `POST /api/schools/admin/clients/:id/marketplace/launch-token`
- `POST /api/schools/admin/clients/:id/reset-password`
- `GET/POST /api/schools/admin/proposals`
- `POST /api/schools/admin/proposals/:id/send`
- `GET/POST /api/schools/admin/agreements`
- `GET/PATCH /api/schools/admin/projects`
- `GET/PATCH /api/schools/admin/milestones/:id`
- `GET /api/schools/admin/payments`
- `GET /api/schools/admin/onboarding/:projectId`
- `POST /api/schools/admin/invitations`
- `GET/PATCH /api/schools/admin/issues`
- `GET/POST /api/schools/admin/trainings`
- `GET/POST /api/schools/admin/handovers`
- `GET/POST /api/schools/admin/packages`
- `GET/POST /api/schools/admin/faqs`
- `GET/PATCH /api/schools/admin/settings`
- `GET /api/schools/admin/reports`
- `GET/POST /api/schools/admin/documents`
- `POST /api/schools/admin/documents/upload`
- `GET /api/schools/admin/documents/:id/file`

Client (requires `Authorization: Bearer <client token>`):

- `GET /api/schools/client/overview`
- `GET/PATCH /api/schools/client/notifications`
- `GET/POST /api/schools/client/onboarding`
- `GET/POST /api/schools/client/payments`
- `POST /api/schools/client/payments/initiate`
- `POST /api/schools/client/marketplace/launch-token`
- `GET/POST /api/schools/client/issues`
- `GET/POST /api/schools/client/messages`
- `GET /api/schools/client/documents`
- `POST /api/schools/client/documents/upload`
- `GET /api/schools/client/documents/:id/file`
- `POST /api/schools/client/student-imports`
- `POST /api/schools/client/final-approval`
- `POST /api/schools/client/handover/acknowledge`

## Workflow

1. A school submits the application form and receives a reference.
2. Admin reviews, updates status and records consultation notes.
3. Admin converts an accepted application into a client account, project and default milestones.
4. Admin creates and sends a proposal. The client accepts, requests changes or declines from the public token link.
5. Admin creates an agreement. The client accepts using legal name and position.
6. Client signs in to the portal and pays the configured initial deposit through Paystack.
7. Webhook verification confirms payment, updates project totals and stage, and creates a receipt.
8. Admin connects the school to the central marketplace and can issue a secure launch token.
9. Client completes onboarding sections and shares teacher/class invitations.
10. Admin tracks milestones, issues, training, deployment and handover in the project views.
11. Client gives final approval and acknowledges handover to complete the project.

## Marketplace integration

When an admin connects a client to the marketplace, a school integration record is created in `mp_school_integrations` with a hashed API key. The API key is shown once and must be copied into the deployed school system. The school system can then use the existing central marketplace endpoints with `x-school-api-key`.

A launch token is a short-lived, single-use bootstrap link for `/marketplace?token=...`. It lets a school administrator open the marketplace with the correct school attribution without exposing the API key in the browser.

PINs remain universal. The school ID on a marketplace order is attribution only and does not lock PINs to that school.

## Render web service

`render.yaml` deploys one Render Web Service from the repository root. The build installs the locked root dependencies, builds the frontend into `frontend/dist`, compiles the backend into `backend/dist`, and `npm start` runs Express. Express serves the API under `/api/*` and the React SPA for all other routes, so the frontend and backend share one Render URL and one origin.

Render sets `VITE_API_URL` to `/`, which resolves to same-origin `/api/*` paths. The frontend does not need a separate backend URL. Render automatically provides `RENDER_EXTERNAL_URL`, which the backend uses for public links and CORS when `CORS_ORIGIN` is not set.

Set all `sync: false` values in the Render dashboard. After the first deploy, point Paystack webhooks at:

```text
https://<your-render-service>.onrender.com/api/marketplace/payment/webhook
https://<your-render-service>.onrender.com/api/schools/payments/webhook
```

## Data isolation and security

- Client JWTs include `clientId`; all client routes filter by that ID.
- Admin roles are checked server-side; sensitive actions require `super_admin`.
- Proposal, agreement and invitation tokens are random, hashed at rest and never logged.
- Payment amounts are calculated by the server from project cost and paid total; the client cannot set them.
- Public forms never return private records.
- Audit entries are written to `sc_activity`.
- Default packages and FAQs are seeded only when empty.
- File inputs are limited by settings stored in `sc_settings`.

## Secure files and student imports

- Uploaded files are stored in `sc_files` and served only through authenticated admin/client download routes.
- Downloads require `Authorization: Bearer <token>`; they are not public URLs.
- Admin uploads are restricted to `super_admin`, `project_manager` and `technical` roles.
- Client downloads are limited to the client's own project and documents marked `clientVisible`.
- MIME type and byte size are enforced from `fileRestrictions` in global settings before a file is stored.
- Student CSV files are parsed on the server, stored in `sc_student_imports`, and validated for header duplicates, row width and size.

## Verification

Run:

```bash
npm test
npm run build
```

`npm test` compiles the backend and runs the marketplace and school-client unit tests.
