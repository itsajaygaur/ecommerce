-- Platform rework: catalog, orders and admin auth.
--
-- This migration reshapes the single `product` table into a real catalog while
-- preserving every existing row. Order of operations matters: new columns are added
-- and backfilled first, and the legacy columns are only dropped at the very end.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "product_status" AS ENUM ('draft', 'active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "order_status" AS ENUM ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "admin_role" AS ENUM ('owner', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_idx" ON "categories" ("slug");

-- ---------------------------------------------------------------------------
-- Slug helper
--
-- Used to derive slugs for legacy products and categories. Folds common accented
-- Latin characters down to ASCII first — without that step "Ünïcode Tee" collapses
-- to "n-code-tee" — then lowercases, replaces non-alphanumerics with hyphens and
-- trims separator runs. `unaccent` is deliberately not used: it is an extension
-- that not every managed Postgres lets a migration create.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mykart_slugify(value text) RETURNS text AS $$
  SELECT COALESCE(
    NULLIF(
      trim(both '-' from regexp_replace(
        lower(translate(
          trim(coalesce(value, '')),
          'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝàáâãäåæçèéêëìíîïñòóôõöøùúûüýÿŠšŽžĐđ',
          'AAAAAAECEEEEIIIINOOOOOOUUUUYaaaaaaeceeeeiiiinoooooouuuuyySszzDd'
        )),
        '[^a-z0-9]+', '-', 'g'
      )),
      ''
    ),
    'item'
  );
$$ LANGUAGE sql IMMUTABLE;

-- ---------------------------------------------------------------------------
-- Products: rename the table, then widen it.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  -- Schema-qualified: a managed Postgres has many schemas, and an unqualified
  -- lookup would match a same-named table in any of them.
  IF EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'product'
     )
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'products'
     ) THEN
    ALTER TABLE "product" RENAME TO "products";
    -- Keep the sequence name aligned with the new table name.
    ALTER SEQUENCE IF EXISTS "product_id_seq" RENAME TO "products_id_seq";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "products" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "description" text DEFAULT '' NOT NULL
);

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "slug" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "price_cents" integer;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "compare_at_price_cents" integer;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "currency" varchar(3) DEFAULT 'INR' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stock" integer DEFAULT 0 NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "status" "product_status" DEFAULT 'draft' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "featured" boolean DEFAULT false NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category_id" integer;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

-- Backfill: rupees -> paise. Legacy `price` was whole rupees.
UPDATE "products" SET "price_cents" = "price" * 100
WHERE "price_cents" IS NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'price'
  );

-- Any row without a legacy price (fresh install) gets a safe zero rather than NULL.
UPDATE "products" SET "price_cents" = 0 WHERE "price_cents" IS NULL;
ALTER TABLE "products" ALTER COLUMN "price_cents" SET NOT NULL;

-- Backfill slugs from titles, appending the id when two titles collide.
UPDATE "products" SET "slug" = mykart_slugify("title") WHERE "slug" IS NULL;

WITH duplicates AS (
  SELECT "id", "slug",
         row_number() OVER (PARTITION BY "slug" ORDER BY "id") AS rn
  FROM "products"
)
UPDATE "products" p
SET "slug" = d."slug" || '-' || p."id"
FROM duplicates d
WHERE p."id" = d."id" AND d.rn > 1;

ALTER TABLE "products" ALTER COLUMN "slug" SET NOT NULL;

-- Existing rows were live on the storefront, so they stay visible with real stock.
UPDATE "products" SET "status" = 'active' WHERE "status" = 'draft';
UPDATE "products" SET "stock" = 25 WHERE "stock" = 0;

-- Promote distinct legacy category strings into the categories table.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'category'
  ) THEN
    -- Legacy data spells the same category several ways ("Men's Clothing" vs
    -- "men's clothing"), all of which slugify identically. Collapse them onto one
    -- row and pick the most-used spelling as the display name, breaking ties by
    -- first appearance so the result is deterministic rather than whichever row
    -- the planner happened to emit first.
    INSERT INTO "categories" ("name", "slug")
    SELECT DISTINCT ON (slug) name, slug
    FROM (
      SELECT trim("category") AS name,
             mykart_slugify("category") AS slug,
             count(*) AS uses,
             min("id") AS first_id
      FROM "products"
      WHERE "category" IS NOT NULL AND trim("category") <> ''
      GROUP BY trim("category"), mykart_slugify("category")
    ) candidates
    ORDER BY slug, uses DESC, first_id
    ON CONFLICT ("slug") DO NOTHING;

    UPDATE "products" p
    SET "category_id" = c."id"
    FROM "categories" c
    WHERE c."slug" = mykart_slugify(p."category") AND p."category_id" IS NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "products_slug_idx" ON "products" ("slug");
CREATE INDEX IF NOT EXISTS "products_status_created_at_idx" ON "products" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products" ("category_id");
CREATE INDEX IF NOT EXISTS "products_price_idx" ON "products" ("price_cents");

DO $$ BEGIN
  ALTER TABLE "products"
    ADD CONSTRAINT "products_category_id_categories_id_fk"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Product images: one row per legacy `image` string.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "product_images" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_id" integer NOT NULL,
  "path" text NOT NULL,
  "alt" text,
  "position" integer DEFAULT 0 NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "product_images"
    ADD CONSTRAINT "product_images_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "product_images_product_id_position_idx"
  ON "product_images" ("product_id", "position");

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'image'
  ) THEN
    INSERT INTO "product_images" ("product_id", "path", "alt", "position")
    SELECT p."id", p."image", p."title", 0
    FROM "products" p
    WHERE p."image" IS NOT NULL
      AND trim(p."image") <> ''
      AND NOT EXISTS (SELECT 1 FROM "product_images" pi WHERE pi."product_id" = p."id");
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Full-text search. Replaces filtering the entire catalog in application memory.
-- ---------------------------------------------------------------------------
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS "products_search_vector_idx" ON "products" USING gin ("search_vector");

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "orders" (
  "id" serial PRIMARY KEY NOT NULL,
  "reference" text NOT NULL,
  "stripe_session_id" text NOT NULL,
  "stripe_payment_intent_id" text,
  "email" text NOT NULL,
  "customer_name" text,
  "phone" text,
  "amount_subtotal_cents" integer NOT NULL,
  "amount_total_cents" integer NOT NULL,
  "currency" varchar(3) DEFAULT 'INR' NOT NULL,
  "status" "order_status" DEFAULT 'pending' NOT NULL,
  "shipping_address" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Unique on the Stripe session id is what makes webhook delivery idempotent:
-- a replayed event hits the conflict instead of writing a duplicate order.
CREATE UNIQUE INDEX IF NOT EXISTS "orders_stripe_session_id_idx" ON "orders" ("stripe_session_id");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_reference_idx" ON "orders" ("reference");
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" ("created_at");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" ("status");

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_id" integer NOT NULL,
  "product_id" integer,
  "title" text NOT NULL,
  "slug" text,
  "image_path" text,
  "unit_price_cents" integer NOT NULL,
  "quantity" integer NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_order_id_orders_id_fk"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" ("order_id");

-- ---------------------------------------------------------------------------
-- Admin auth
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "password_hash" text NOT NULL,
  "role" "admin_role" DEFAULT 'staff' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_login_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_idx" ON "admin_users" ("email");

CREATE TABLE IF NOT EXISTS "login_attempts" (
  "id" serial PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "login_attempts_identifier_created_at_idx"
  ON "login_attempts" ("identifier", "created_at");

-- ---------------------------------------------------------------------------
-- Finally, retire the legacy columns now that everything is backfilled.
-- ---------------------------------------------------------------------------
ALTER TABLE "products" DROP COLUMN IF EXISTS "price";
ALTER TABLE "products" DROP COLUMN IF EXISTS "category";
ALTER TABLE "products" DROP COLUMN IF EXISTS "image";
