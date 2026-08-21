# PATINA

A small, production-minded e-commerce platform: a storefront with server-side search and
filtering, Stripe Checkout with server-authoritative pricing, recorded orders, and a back
office that reports on real data.

Built with Next.js 16 (App Router), React 19, Tailwind CSS v4, Drizzle ORM and PostgreSQL.

---

## Design system — "Ink & Signal"

The whole visual language lives in `app/globals.css`. Three rules decide every component:

1. **Structure comes from 1px hairline rules** — never from fills, radii or shadows. A
   "card" is a ruled cell. The only elevation in the system belongs to floating overlays
   (dialog, sheet, menu, toast), and the small `shadow-*` steps are remapped to `none` at
   the token layer so a stray one is inert by construction.
2. **Colour is a signal, not a surface.** Every neutral is zero chroma. The one hue —
   electric cobalt, `--signal` — is reserved for price, the primary action, focus rings and
   inline links. It is never a background or a border.
3. **Hierarchy comes from width and scale.** Archivo is loaded with its `wdth` axis, so
   headings are _widened_ (112–122%) rather than merely bolded; everything structural is an
   11px wide-tracked uppercase mono micro-label (`.eyebrow`).

Two conventions worth knowing before editing:

- **`.on-ink`** re-derives the token set for inverted bands. The light-mode signal is only
  2.95:1 on near-black, so a band lifts it to a passing value rather than banning colour
  from dark surfaces. In dark mode the same class becomes a _raised_ panel, because a
  literal inversion would be a glaring white slab.
- **Never apply `uppercase` to an interactive element.** Chromium computes accessible names
  from rendered text, so a CSS-uppercased button renames itself for screen readers — and for
  every `getByRole('button', { name })` assertion in `e2e/`. Caps belong on non-interactive
  micro-labels only.

The brand palette is duplicated as literal hexes in exactly two places that cannot read CSS
variables — `viewport.themeColor` in `app/layout.tsx` and `app/opengraph-image.tsx` (Satori
does not resolve `var()`). Move them together with the tokens.

### The rebrand and what it deliberately did not touch

The store was renamed from MyKart to PATINA. Brand surfaces changed; wire identifiers did
not, because renaming them breaks a running deployment:

| Identifier                        | Where                                           | Why it keeps the old name                                                                          |
| --------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `_mykart_migrations`              | `db/migrate.ts`                                 | The ledger would read as empty and every migration would re-run against a populated database.      |
| `mykart_slugify`                  | `drizzle/0001_platform.sql`                     | An applied migration. Renaming it in the file would make the repo disagree with the live database. |
| `mykart_session`, issuer/audience | `lib/auth/session.ts`                           | Verified JWT claims and the cookie name a signed-in admin's browser already holds.                 |
| `mykart.cart`                     | `hooks/use-cart.ts`                             | The localStorage key. A rename silently empties every shopper's bag.                               |
| `mykart_ci`, `admin@mykart.local` | `.github/workflows/ci.yml`, `e2e/admin.spec.ts` | Paired CI values; changing one without the other turns the e2e job red.                            |

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
| `STRIPE_WEBHOOK_SECRET`            | recommended  | Signing secret for the endpoint below. Not required — see [Stripe webhook](#stripe-webhook).                   |
| `SUPABASE_URL`                     | for uploads  | Supabase project URL.                                                                                          |
| `SUPABASE_SERVICE_ROLE_KEY`        | for uploads  | Server-side storage credential. Never exposed to the client.                                                   |
| `SUPABASE_STORAGE_BUCKET`          | for uploads  | Bucket name (default `ecommerce`).                                                                             |
| `NEXT_PUBLIC_SUPABASE_STORAGE_URL` | for uploads  | Public object base URL. Its hostname is what `next/image` is allowed to optimise.                              |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`    | first run    | Read once by `db:seed` to create the initial admin. Not used at runtime afterwards.                            |

Two variables were renamed from the pre-rewrite app. The old names are still read as a
fallback, with a warning, so an existing deployment does not break on the rename:

| Legacy name  | Current name     |
| ------------ | ---------------- |
| `DB_URL`     | `DATABASE_URL`   |
| `JWT_SECRET` | `SESSION_SECRET` |

`SUPABASE_ANON_KEY` is deliberately **not** aliased to `SUPABASE_SERVICE_ROLE_KEY` — they
carry different privileges, and the anon key cannot write to Storage.

### Administrators

Credentials live in `admin_users` as scrypt hashes, so they cannot be changed with a plain
SQL `UPDATE` — the hash has to be derived. Use the script:

```bash
npm run db:admin -- you@example.com                  # generates a password and prints it
npm run db:admin -- you@example.com "a password"     # sets a specific one
npm run db:admin -- colleague@example.com --role staff
```

Re-running it for an existing address resets that account's password and clears any
sign-in throttle.

### Stripe webhook

**Orders are written twice over, and the webhook is the second of the two.** After payment
Stripe redirects to `/orders/confirmation?session_id=…`, which calls the same idempotent
writer the webhook calls (`lib/orders/record.ts`). A unique index on
`orders.stripe_session_id` lets the two race safely: whichever arrives first creates the
order, the other reads back its reference, and stock is decremented exactly once.

So the redirect records the order on its own, and a deployment with no
`STRIPE_WEBHOOK_SECRET` still takes payments and stores them correctly — nothing fails at
build or boot, because both Stripe variables are optional and read lazily.

What you lose without the webhook is the case where the shopper never completes the
redirect: they close the tab on the Stripe page after paying, the connection drops, or they
use a delayed payment method — `checkout.session.async_payment_succeeded` settles _after_
the redirect and can only ever arrive by webhook. Those payments would be taken with no
order recorded. Set it up.

Register an endpoint for `checkout.session.completed` at `<site>/api/webhooks/stripe` and
put its signing secret in `STRIPE_WEBHOOK_SECRET`. Locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

If an endpoint is registered but the secret is missing, the route answers 500 and Stripe
retries with backoff before disabling the endpoint — a misconfiguration that is quiet from
inside the app, so check the endpoint's delivery log after the first real payment.

### Test mode

Test and live are separate worlds in Stripe, each with its own keys and its own webhook
signing secrets. **Test mode needs no account activation and no business verification** —
those gate live mode, meaning real cards and payouts. A test-mode deployment is fully
functional: create the webhook endpoint with the Dashboard's _Test mode_ toggle on, and its
`whsec_…` is the real secret for that deployment.

When `STRIPE_SECRET_KEY` starts with `sk_test_`, the storefront says so at the point of
payment — the cart summary and the bag drawer show the test card to use. That notice is
derived from the key prefix (`isStripeTestMode()` in `lib/stripe.ts`) rather than a separate
flag, so it cannot be left switched on next to a live key.

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
| `npm run db:admin`                        | Create an administrator, or reset one's password.                      |
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
- **Row Level Security is enabled on every table, with no policies.** On Supabase this
  matters: every table in `public` is otherwise exposed over PostgREST and pg_graphql to
  the `anon` role, whose key is public by design — which would have made `admin_users`
  (password hashes) and `orders` (names, emails, postal addresses) readable by anyone.
  The app is unaffected because it connects directly over `DATABASE_URL` as a role with
  `BYPASSRLS`, and reaches Storage with the service-role key. `SELECT` is also revoked
  from `anon`/`authenticated` so the tables are not even discoverable.

---

## Deploying

1. Provision PostgreSQL and set the environment variables above.
2. Run `npm run db:migrate` as part of the release (before the new build serves traffic).
3. Register the Stripe webhook endpoint and set `STRIPE_WEBHOOK_SECRET`.
4. On first deploy only, run `npm run db:seed` to create the initial admin.

**A green build does not mean the environment is configured.** Database reads are
tolerated at build time (see `lib/queries/prerender.ts`), and every secret is validated
lazily at request time — both deliberate, so one missing value cannot fail a deployment
that would otherwise be fine. The cost is that a missing `DATABASE_URL` builds and
deploys cleanly, then throws on the first catalog request while the home page serves an
empty build-time snapshot. After changing environment variables on a hosted platform,
**redeploy** — running instances do not pick up new values — and then check
`/products`, not just `/`.

CI (`.github/workflows/ci.yml`) runs format, lint, typecheck and unit tests, then
migrates a throwaway Postgres, builds, and runs the Playwright suite against it.
