import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

/**
 * Postgres `tsvector`. Drizzle has no built-in mapping, but declaring it here lets
 * queries reference `products.searchVector` and get the correctly-quoted column
 * name instead of hand-writing `"products"."search_vector"` at each call site.
 * The column itself is `GENERATED ALWAYS AS ... STORED` (see the migration).
 */
const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => 'tsvector',
})

/**
 * Money is stored as integer minor units (paise for INR) everywhere. The original
 * schema used a plain `integer` for rupees, which cannot represent a price like
 * ₹499.50 and silently truncated anything Stripe returned in minor units.
 */

export const productStatus = pgEnum('product_status', ['draft', 'active', 'archived'])

export const orderStatus = pgEnum('order_status', [
  'pending',
  'paid',
  'fulfilled',
  'cancelled',
  'refunded',
])

export const adminRole = pgEnum('admin_role', ['owner', 'staff'])

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('categories_slug_idx').on(table.slug)],
)

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    priceCents: integer('price_cents').notNull(),
    /** Optional "was" price. Rendered struck-through when higher than priceCents. */
    compareAtPriceCents: integer('compare_at_price_cents'),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    stock: integer('stock').notNull().default(0),
    status: productStatus('status').notNull().default('draft'),
    featured: boolean('featured').notNull().default(false),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    /** Generated in Postgres from title (weight A) and description (weight B). */
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(description, '')), 'B')`,
    ),
  },
  (table) => [
    uniqueIndex('products_slug_idx').on(table.slug),
    index('products_status_created_at_idx').on(table.status, table.createdAt),
    index('products_category_id_idx').on(table.categoryId),
    index('products_price_idx').on(table.priceCents),
  ],
)

/**
 * Products previously carried a single `image` string. A real PDP needs a gallery,
 * so imagery lives in its own table ordered by `position` (0 is the primary image).
 */
export const productImages = pgTable(
  'product_images',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** Object key within the storage bucket, not a full URL. */
    path: text('path').notNull(),
    alt: text('alt'),
    position: integer('position').notNull().default(0),
  },
  (table) => [index('product_images_product_id_position_idx').on(table.productId, table.position)],
)

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type ShippingAddress = {
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
}

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    /** Public, unguessable handle used in confirmation URLs. */
    reference: text('reference').notNull(),
    stripeSessionId: text('stripe_session_id').notNull(),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    email: text('email').notNull(),
    customerName: text('customer_name'),
    phone: text('phone'),
    amountSubtotalCents: integer('amount_subtotal_cents').notNull(),
    amountTotalCents: integer('amount_total_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    status: orderStatus('status').notNull().default('pending'),
    shippingAddress: jsonb('shipping_address').$type<ShippingAddress>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Unique so that a replayed Stripe webhook cannot create a second order.
    uniqueIndex('orders_stripe_session_id_idx').on(table.stripeSessionId),
    uniqueIndex('orders_reference_idx').on(table.reference),
    index('orders_created_at_idx').on(table.createdAt),
    index('orders_status_idx').on(table.status),
  ],
)

/**
 * Title, image and unit price are denormalised on purpose: an order is a historical
 * record and must not change when the product is later renamed, repriced or deleted.
 */
export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    slug: text('slug'),
    imagePath: text('image_path'),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
  },
  (table) => [index('order_items_order_id_idx').on(table.orderId)],
)

// ---------------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------------

export const adminUsers = pgTable(
  'admin_users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name'),
    /** scrypt, formatted as `scrypt$N$r$p$<salt b64>$<hash b64>`. */
    passwordHash: text('password_hash').notNull(),
    role: adminRole('role').notNull().default('staff'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('admin_users_email_idx').on(table.email)],
)

/**
 * Durable record of failed sign-ins so throttling survives serverless cold starts
 * (an in-process counter would reset on every new lambda).
 */
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: serial('id').primaryKey(),
    identifier: text('identifier').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('login_attempts_identifier_created_at_idx').on(table.identifier, table.createdAt),
  ],
)

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
}))

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}))

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}))

// ---------------------------------------------------------------------------
// Inferred types — these replace the hand-written duplicates in types/index.ts,
// which could (and did) drift from the actual table definition.
// ---------------------------------------------------------------------------

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type ProductRow = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type ProductImage = typeof productImages.$inferSelect
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type OrderItem = typeof orderItems.$inferSelect
export type NewOrderItem = typeof orderItems.$inferInsert
export type AdminUser = typeof adminUsers.$inferSelect
