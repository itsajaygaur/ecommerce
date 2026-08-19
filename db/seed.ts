import { loadEnvConfig } from '@next/env'
import { readEnv } from '@/lib/env'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { hashPassword } from '../lib/auth/password'
import { slugify } from '../lib/slug'
import * as schema from './schema'

loadEnvConfig(process.cwd())

/**
 * Seeds a development catalog and bootstraps the first admin account.
 *
 * Safe to re-run: products are upserted by slug, categories by slug, and the admin
 * user is only created if the email is not already present.
 *
 * The seeded imagery points at local SVG placeholders under /public so a fresh
 * clone renders a complete storefront without needing Supabase credentials.
 */

type SeedProduct = {
  title: string
  description: string
  price: number
  compareAt?: number
  stock: number
  featured?: boolean
  category: string
  image: string
}

const CATEGORIES = [
  { name: 'Apparel', description: 'Everyday layers cut from natural fibres.' },
  { name: 'Footwear', description: 'Resoleable boots, sneakers and sandals.' },
  { name: 'Bags', description: 'Carry-alls built to outlast a decade of commutes.' },
  { name: 'Home', description: 'Quiet objects for the rooms you actually use.' },
  { name: 'Accessories', description: 'The small things you reach for daily.' },
]

const PRODUCTS: SeedProduct[] = [
  {
    title: 'Oxford Shirt in Brushed Cotton',
    description:
      'Woven from long-staple cotton and brushed for softness, this oxford keeps its structure through the working week. Mother-of-pearl buttons, a single chest pocket and a slightly relaxed body that layers without bunching.',
    price: 249900,
    compareAt: 319900,
    stock: 42,
    featured: true,
    category: 'Apparel',
    image: '/products/oxford-shirt.svg',
  },
  {
    title: 'Merino Crew Knit',
    description:
      'Fine-gauge merino spun in a mill that has been at it for four generations. Warm without weight, and it holds its shape after a season of wear because the ribbing is knitted rather than sewn on.',
    price: 429900,
    stock: 18,
    featured: true,
    category: 'Apparel',
    image: '/products/merino-crew.svg',
  },
  {
    title: 'Garment-Dyed Chore Coat',
    description:
      'A workwear silhouette in heavy cotton canvas, dyed after construction so the seams fade at their own pace. Three patch pockets, a corduroy collar and enough room for a knit underneath.',
    price: 689900,
    compareAt: 799900,
    stock: 9,
    category: 'Apparel',
    image: '/products/chore-coat.svg',
  },
  {
    title: 'Everyday Chino',
    description:
      'Cotton twill with a touch of stretch, cut straight through the leg and finished with a clean hem. The fabric softens rather than thins, so the fifth year looks better than the first.',
    price: 329900,
    stock: 55,
    category: 'Apparel',
    image: '/products/chino.svg',
  },
  {
    title: 'Leather Weekender',
    description:
      'Full-grain vegetable-tanned leather over a cotton drill lining, with solid brass hardware and a base that will not sag when loaded. Fits three days of clothing and a pair of shoes.',
    price: 1299900,
    compareAt: 1549900,
    stock: 6,
    featured: true,
    category: 'Bags',
    image: '/products/weekender.svg',
  },
  {
    title: 'Waxed Canvas Daypack',
    description:
      'A roll-top pack in British waxed canvas that sheds a downpour and rewaxes in an afternoon. Padded laptop sleeve, two internal pockets and leather-reinforced stress points.',
    price: 649900,
    stock: 23,
    category: 'Bags',
    image: '/products/daypack.svg',
  },
  {
    title: 'Structured Card Wallet',
    description:
      'Four card slots and a note pocket in a wallet thin enough to forget. Skived and burnished by hand at the edges, which is the part that usually fails first.',
    price: 189900,
    stock: 74,
    category: 'Accessories',
    image: '/products/wallet.svg',
  },
  {
    title: 'Goodyear-Welted Derby',
    description:
      'A welted derby that can be resoled indefinitely, on a last shaped for actual walking. Calf leather uppers, leather insole that moulds to the foot, storm welt for wet mornings.',
    price: 1849900,
    stock: 11,
    featured: true,
    category: 'Footwear',
    image: '/products/derby.svg',
  },
  {
    title: 'Court Sneaker in White',
    description:
      'A pared-back court shoe with a vulcanised sole and a single tonal logo pressed into the heel. Wipes clean, wears in, and does not shout about it.',
    price: 749900,
    compareAt: 899900,
    stock: 31,
    category: 'Footwear',
    image: '/products/sneaker.svg',
  },
  {
    title: 'Stoneware Mug Set',
    description:
      'Four mugs thrown in a small studio and glazed in a matte oatmeal that varies slightly piece to piece. Dishwasher safe, though they age more gracefully by hand.',
    price: 289900,
    stock: 27,
    category: 'Home',
    image: '/products/mug-set.svg',
  },
  {
    title: 'Linen Throw',
    description:
      'Washed European linen with a hand-knotted fringe, heavy enough to stay put on a sofa and breathable enough to sleep under in summer.',
    price: 469900,
    stock: 14,
    category: 'Home',
    image: '/products/throw.svg',
  },
  {
    title: 'Brass Desk Lamp',
    description:
      'Solid brass with a weighted base and a friction hinge that actually holds its angle. Ships with a warm dimmable bulb; the finish will patina unless you polish it.',
    price: 959900,
    stock: 0,
    category: 'Home',
    image: '/products/desk-lamp.svg',
  },
  {
    title: 'Cotton Web Belt',
    description:
      'A woven cotton belt with a solid brass roller buckle and a leather tab. Trim it to length with scissors and seal the end with a lighter.',
    price: 129900,
    stock: 63,
    category: 'Accessories',
    image: '/products/belt.svg',
  },
  {
    title: 'Field Watch, 38mm',
    description:
      'A legible field watch on a sapphire crystal and a 20mm strap you can swap without tools. Automatic movement, 100m water resistance, no date window.',
    price: 2249900,
    compareAt: 2599900,
    stock: 4,
    featured: true,
    category: 'Accessories',
    image: '/products/watch.svg',
  },
]

async function main() {
  const url = readEnv('DATABASE_URL')
  if (!url) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.')
    process.exit(1)
  }

  const sql = postgres(url, { max: 1, onnotice: () => {} })
  const db = drizzle(sql, { schema })

  try {
    // -- Categories --------------------------------------------------------
    const categoryIds = new Map<string, number>()

    for (const [index, category] of CATEGORIES.entries()) {
      const slug = slugify(category.name)
      const [row] = await db
        .insert(schema.categories)
        .values({ name: category.name, slug, description: category.description, position: index })
        .onConflictDoUpdate({
          target: schema.categories.slug,
          set: { name: category.name, description: category.description, position: index },
        })
        .returning({ id: schema.categories.id })

      if (row) categoryIds.set(category.name, row.id)
    }

    console.log(`Seeded ${categoryIds.size} categories.`)

    // -- Products ----------------------------------------------------------
    let productCount = 0

    for (const product of PRODUCTS) {
      const slug = slugify(product.title)

      const [row] = await db
        .insert(schema.products)
        .values({
          slug,
          title: product.title,
          description: product.description,
          priceCents: product.price,
          compareAtPriceCents: product.compareAt ?? null,
          stock: product.stock,
          // A zero-stock product stays visible so the storefront can show a
          // sold-out state; only `archived` hides it.
          status: 'active',
          featured: product.featured ?? false,
          categoryId: categoryIds.get(product.category) ?? null,
        })
        .onConflictDoUpdate({
          target: schema.products.slug,
          set: {
            title: product.title,
            description: product.description,
            priceCents: product.price,
            compareAtPriceCents: product.compareAt ?? null,
            stock: product.stock,
            status: 'active',
            featured: product.featured ?? false,
            categoryId: categoryIds.get(product.category) ?? null,
            updatedAt: new Date(),
          },
        })
        .returning({ id: schema.products.id })

      if (!row) continue
      productCount += 1

      // Replace imagery wholesale so re-running the seed does not stack duplicates.
      await db.delete(schema.productImages).where(eq(schema.productImages.productId, row.id))
      await db
        .insert(schema.productImages)
        .values({ productId: row.id, path: product.image, alt: product.title, position: 0 })
    }

    console.log(`Seeded ${productCount} products.`)

    // -- Bootstrap admin ---------------------------------------------------
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
    const password = process.env.ADMIN_PASSWORD || ''

    if (!email || !password) {
      console.log('ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin bootstrap.')
    } else {
      const existing = await db
        .select({ id: schema.adminUsers.id })
        .from(schema.adminUsers)
        .limit(1)

      if (existing.length > 0) {
        console.log('An admin already exists — leaving credentials untouched.')
      } else {
        await db.insert(schema.adminUsers).values({
          email,
          name: 'Owner',
          passwordHash: await hashPassword(password),
          role: 'owner',
        })
        console.log(`Created admin account for ${email}.`)
      }
    }

    console.log('\nSeed complete.')
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error('\nSeed failed:')
  console.error(error)
  process.exit(1)
})
