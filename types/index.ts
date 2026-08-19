/**
 * Shared types.
 *
 * Table shapes are inferred from the Drizzle schema rather than hand-written. The
 * previous `Product` type was a manual copy of the `product` table and had already
 * drifted from it (it carried an optional `rating` the database never had, and a
 * `quantity` that only ever existed in the cart).
 */

export type {
  AdminUser,
  Category,
  NewCategory,
  NewOrder,
  NewOrderItem,
  NewProduct,
  Order,
  OrderItem,
  ProductImage,
  ProductRow,
  ShippingAddress,
} from '@/db/schema'

export type { ProductDetail, ProductListItem, SortKey } from '@/lib/catalog'
export type { CartLine } from '@/hooks/use-cart'

/** A single item in the admin sidebar. */
export type NavItem = {
  title: string
  href: string
  icon: 'dashboard' | 'products' | 'orders' | 'categories' | 'storefront'
  exact?: boolean
}
