# MyKart

A small, production-minded e-commerce platform: a storefront with server-side search and
filtering, Stripe Checkout with server-authoritative pricing, recorded orders, and a back
office that reports on real data.

Built with Next.js 16 (App Router), React 19, Tailwind CSS v4, Drizzle ORM and PostgreSQL.

---

## Getting started

Requirements: **Node 20.9+** and a **PostgreSQL 14+** database.

```bash
npm install
cp .env.example .env.local     # then fill in the values (see below)
npm run db:migrate             # create/upgrade the schema
npm run db:seed                # sample catalog + first admin account
npm run dev
```

The storefront is at `http://localhost:3000` and the back office at `/admin`, using the
`ADMIN_EMAIL` / `ADMIN_PASSWORD` you set before seeding.

Without `SUPABASE_*` configured, image uploads are unavailable but everything else works —
the seeded catalog uses local placeholder artwork under `public/products`.

### Environment

| Variable                           | Required     | Purpose                                                                                                        |
| ---------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                     | yes          | PostgreSQL connection string.                                                                                  |
| `NEXT_PUBLIC_SITE_URL`             | yes          | Canonical origin. Used for Stripe redirects, sitemap, robots and Open Graph. **Never** taken from the browser. |
| `SESSION_SECRET`                   | yes          | Signs admin session JWTs. 32+ chars: `openssl rand -base64 48`.                                                |
| `STRIPE_SECRET_KEY`                | for checkout | Stripe API key.                                                                                                |
| `STRIPE_WEBHOOK_SECRET`            | for orders   | Signing secret for the endpoint below.                                                                         |
| `SUPABASE_URL`                     | for uploads  | Supabase project URL.                                                                                          |
| `SUPABASE_SERVICE_ROLE_KEY`        | for uploads  | Server-side storage credential. Never exposed to the client.                                                   |
| `SUPABASE_STORAGE_BUCKET`          | for uploads  | Bucket name (default `ecommerce`).                                                                             |
| `NEXT_PUBLIC_SUPABASE_STORAGE_URL` | for uploads  | Public object base URL. Its hostname is what `next/image` is allowed to optimise.                              |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`    | first run    | Read once by `db:seed` to create the initial admin. Not used at runtime afterwards.                            |

### Stripe webhook

Orders are written by the webhook, so register an endpoint for
`checkout.session.completed` at `<site>/api/webhooks/stripe` and put its signing secret in
`STRIPE_WEBHOOK_SECRET`. Locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The confirmation page runs the same idempotent writer, so a customer sees their order even
if webhook delivery lags. A unique index on `orders.stripe_session_id` guarantees only one
order is ever created.

---

## Scripts

| Command                                   | What it does                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                             | Development server.                                                    |
| `npm run build` / `npm start`             | Production build and server.                                           |
| `npm run lint` / `npm run typecheck`      | ESLint (flat config) and `tsc --noEmit`.                               |
| `npm run format` / `npm run format:check` | Prettier.                                                              |
| `npm test`                                | Vitest unit tests.                                                     |
| `npm run test:e2e`                        | Playwright end-to-end tests (needs a built app and a seeded database). |
| `npm run db:migrate`                      | Apply SQL migrations in `drizzle/`.                                    |
| `npm run db:seed`                         | Seed the catalog and bootstrap the first admin.                        |
| `npm run db:generate`                     | Drizzle Kit schema diff, for authoring new migrations.                 |
| `npm run db:studio`                       | Drizzle Studio.                                                        |

---

## Architecture

```
app/
  (storefront)/            Public routes: home, catalog, product, cart, orders
  (admin)/admin/           Back office; (dashboard) segment requires a session
  api/webhooks/stripe/     Signature-verified order recording
  product/[id]/            308 redirect from legacy numeric product URLs
components/
  ui/                      Design-system primitives (Radix + Tailwind v4)
  storefront/  admin/      Feature components
lib/
  actions/                 Server Actions — every mutation guards with requireAdmin()
  queries/                 Read paths (server-only)
  checkout/pricing.ts      Pure repricing logic; the single source of truth for charges
  orders/record.ts         Idempotent order writer, shared by webhook and confirmation
  auth/                    session (Edge-safe) · password (scrypt) · guards
db/
  schema.ts  migrate.ts  seed.ts
drizzle/                   Hand-written SQL migrations
tests/  e2e/               Vitest unit tests · Playwright specs
```

### Notes on a few deliberate choices

**Money is integer minor units everywhere** — database, Stripe payloads, cart. Never
floating-point rupees.

**Migrations are hand-written** rather than generated, because reshaping the original
schema had to preserve live data (rupees → paise, slug derivation, promoting category
strings into rows). They are applied by `db/migrate.ts`, which sends each file whole over
the simple query protocol so `DO $$ … $$` blocks survive intact.

**Search uses a generated `tsvector` column with a GIN index.** Filtering, sorting and
paging all happen in Postgres.

**Compact currency formatting is hand-rolled.** `Intl`'s `notation: 'compact'` is not
portable — for `en-IN`, Node renders `₹2.5K` where Chromium renders `₹2.5T` — which caused
a React hydration mismatch on every catalog page.

**Raw `sql` fragments spell out qualified column names.** Drizzle emits interpolated
column references _unqualified_, so `${products.id}` inside a subquery becomes a bare
`"id"` that Postgres binds to the inner table. `tests/correlated-subqueries.test.ts`
enforces this.

**No `loading.tsx` at the storefront route-group root.** Its Suspense boundary commits a
200 before `notFound()` resolves, so unknown products returned HTTP 200 with 404 content.
Per-page `<Suspense>` provides the skeletons instead.

---

## Security

The checkout and admin paths are the parts worth reading closely:

- **Prices are server-authoritative.** The client sends only `{ productId, quantity }`;
  `lib/checkout/pricing.ts` re-reads every price from the database. A tampered cart is
  charged the catalog price.
- **Every admin mutation calls `requireAdmin()`.** `proxy.ts` only gates navigation —
  Server Actions are POST endpoints reachable without matching a route, so authorisation
  lives next to the mutation.
- **Webhook payloads are signature-verified** against `STRIPE_WEBHOOK_SECRET` before
  anything is written, and order creation is idempotent.
- **Passwords use scrypt** with a per-user salt and constant-time comparison; parameters
  are stored with the hash so they can be raised later.
- **Sessions** are HS256 JWTs in an `httpOnly`, `secure`, `sameSite=lax` cookie.
- **Uploads** are validated server-side (MIME allowlist, size cap) and stored under random
  UUID keys, so a filename can never influence the object path.
- **Sign-in is throttled** per email address, with an identical message for unknown
  accounts and wrong passwords.
- Security headers are set in `next.config.ts`; `x-powered-by` is off.

---

## Deploying

1. Provision PostgreSQL and set the environment variables above.
2. Run `npm run db:migrate` as part of the release (before the new build serves traffic).
3. Register the Stripe webhook endpoint and set `STRIPE_WEBHOOK_SECRET`.
4. On first deploy only, run `npm run db:seed` to create the initial admin.

CI (`.github/workflows/ci.yml`) runs format, lint, typecheck and unit tests, then
migrates a throwaway Postgres, builds, and runs the Playwright suite against it.
