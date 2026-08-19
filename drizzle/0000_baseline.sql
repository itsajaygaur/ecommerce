-- Baseline: the schema as it existed before the platform rework.
--
-- On the existing production database this is a no-op (the table is already there).
-- On a fresh database it establishes the same starting point, so migration 0001
-- has one shape to migrate from regardless of where it runs.

CREATE TABLE IF NOT EXISTS "product" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "price" integer NOT NULL,
  "description" text NOT NULL,
  "category" text NOT NULL,
  "image" text NOT NULL
);
