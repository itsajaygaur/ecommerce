'use server'

import { revalidatePath } from 'next/cache'
import { and, asc, eq, inArray, like, ne, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { categories, orderItems, productImages, products } from '@/db/schema'
import { AuthorizationError, requireAdmin } from '@/lib/auth'
import { parsePriceToMinorUnits } from '@/lib/money'
import { slugify, uniqueSlug } from '@/lib/slug'
import { deleteImages, uploadImage, validateImage } from '@/lib/storage'
import { categoryFormSchema, productFormSchema } from '@/lib/validation/product'

/**
 * Admin catalog mutations.
 *
 * Every export starts with `requireAdmin()`. The previous versions had no
 * authorisation check at all: `proxy.ts`/`middleware.ts` only guards navigation,
 * while a Server Action is a POST endpoint that any caller can invoke directly once
 * the action id is known. Guarding the route was never guarding the mutation.
 */

export type ActionResult = { ok: boolean; message: string; fieldErrors?: Record<string, string> }

const AUTH_FAILURE: ActionResult = {
  ok: false,
  message: 'You must be signed in as an administrator to do that.',
}

/** Wraps an action so authorisation and unexpected failures become clean results. */
async function guarded(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    await requireAdmin()
    return await fn()
  } catch (error) {
    if (error instanceof AuthorizationError) return AUTH_FAILURE
    // Next signals redirects by throwing; those must propagate untouched.
    if (error && typeof error === 'object' && 'digest' in error) throw error

    console.error('[admin] action failed', error)
    return { ok: false, message: 'Something went wrong. Please try again.' }
  }
}

function revalidateCatalog(slug?: string | null) {
  revalidatePath('/')
  revalidatePath('/products')
  revalidatePath('/admin/products')
  revalidatePath('/admin')
  if (slug) revalidatePath(`/products/${slug}`)
}

async function resolveSlug(desired: string, title: string, excludeId?: number): Promise<string> {
  const base = desired ? slugify(desired) : slugify(title)

  const conflicting = await db
    .select({ slug: products.slug })
    .from(products)
    .where(
      and(
        or(eq(products.slug, base), like(products.slug, `${base}-%`)),
        excludeId ? ne(products.id, excludeId) : undefined,
      ),
    )

  return uniqueSlug(
    base,
    conflicting.map((row) => row.slug),
  )
}

function parseForm(formData: FormData) {
  return productFormSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') ?? '',
    price: formData.get('price'),
    compareAtPrice: formData.get('compareAtPrice') ?? undefined,
    stock: formData.get('stock') ?? '0',
    categoryId: formData.get('categoryId') ?? undefined,
    status: formData.get('status') ?? 'draft',
    featured: formData.get('featured') ?? '',
    slug: formData.get('slug') ?? undefined,
  })
}

function fieldErrorsFrom(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = parseForm(formData)
    if (!parsed.success) {
      return {
        ok: false,
        message: 'Please fix the highlighted fields.',
        fieldErrors: fieldErrorsFrom(parsed.error),
      }
    }

    const values = parsed.data
    const priceCents = parsePriceToMinorUnits(values.price)
    if (priceCents === null) return { ok: false, message: 'Enter a valid price.' }

    const compareAtPriceCents = values.compareAtPrice
      ? parsePriceToMinorUnits(values.compareAtPrice)
      : null

    const files = formData
      .getAll('images')
      .filter((f): f is File => f instanceof File && f.size > 0)
    for (const file of files) {
      const check = validateImage(file)
      if (!check.ok) return { ok: false, message: check.message }
    }

    // Images upload first: if storage fails we abort before writing any row, so the
    // catalog never contains a product pointing at an object that does not exist.
    const uploaded: string[] = []
    for (const file of files) {
      const result = await uploadImage(file)
      if (!result.ok) {
        await deleteImages(uploaded)
        return { ok: false, message: result.message }
      }
      uploaded.push(result.path)
    }

    const slug = await resolveSlug(values.slug ?? '', values.title)

    try {
      await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(products)
          .values({
            slug,
            title: values.title,
            description: values.description,
            priceCents,
            compareAtPriceCents,
            stock: Number(values.stock),
            status: values.status,
            featured: values.featured === 'on' || values.featured === 'true',
            categoryId: values.categoryId ? Number(values.categoryId) : null,
          })
          .returning({ id: products.id })

        if (row && uploaded.length > 0) {
          await tx.insert(productImages).values(
            uploaded.map((path, index) => ({
              productId: row.id,
              path,
              alt: values.title,
              position: index,
            })),
          )
        }
      })
    } catch (error) {
      await deleteImages(uploaded)
      throw error
    }

    revalidateCatalog(slug)
    return { ok: true, message: 'Product created.' }
  })
}

export async function updateProduct(productId: number, formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = parseForm(formData)
    if (!parsed.success) {
      return {
        ok: false,
        message: 'Please fix the highlighted fields.',
        fieldErrors: fieldErrorsFrom(parsed.error),
      }
    }

    const values = parsed.data
    const priceCents = parsePriceToMinorUnits(values.price)
    if (priceCents === null) return { ok: false, message: 'Enter a valid price.' }

    const [existing] = await db
      .select({ id: products.id, slug: products.slug })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)

    if (!existing) return { ok: false, message: 'That product no longer exists.' }

    const files = formData
      .getAll('images')
      .filter((f): f is File => f instanceof File && f.size > 0)
    for (const file of files) {
      const check = validateImage(file)
      if (!check.ok) return { ok: false, message: check.message }
    }

    const removedImageIds = formData
      .getAll('removeImageIds')
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)

    const uploaded: string[] = []
    for (const file of files) {
      const result = await uploadImage(file)
      if (!result.ok) {
        // Nothing has been committed yet, so the existing imagery is untouched.
        await deleteImages(uploaded)
        return { ok: false, message: result.message }
      }
      uploaded.push(result.path)
    }

    const slug = await resolveSlug(values.slug ?? existing.slug, values.title, productId)
    let orphanedPaths: string[] = []

    try {
      orphanedPaths = await db.transaction(async (tx) => {
        await tx
          .update(products)
          .set({
            slug,
            title: values.title,
            description: values.description,
            priceCents,
            compareAtPriceCents: values.compareAtPrice
              ? parsePriceToMinorUnits(values.compareAtPrice)
              : null,
            stock: Number(values.stock),
            status: values.status,
            featured: values.featured === 'on' || values.featured === 'true',
            categoryId: values.categoryId ? Number(values.categoryId) : null,
            updatedAt: new Date(),
          })
          .where(eq(products.id, productId))

        let removedPaths: string[] = []
        if (removedImageIds.length > 0) {
          removedPaths = (
            await tx
              .delete(productImages)
              .where(
                and(
                  eq(productImages.productId, productId),
                  inArray(productImages.id, removedImageIds),
                ),
              )
              .returning({ path: productImages.path })
          ).map((row) => row.path)
        }

        if (uploaded.length > 0) {
          const [{ nextPosition } = { nextPosition: 0 }] = await tx
            .select({
              nextPosition: sql<number>`cast(coalesce(max(${productImages.position}) + 1, 0) as int)`,
            })
            .from(productImages)
            .where(eq(productImages.productId, productId))

          await tx.insert(productImages).values(
            uploaded.map((path, index) => ({
              productId,
              path,
              alt: values.title,
              position: nextPosition + index,
            })),
          )
        }

        return removedPaths
      })
    } catch (error) {
      await deleteImages(uploaded)
      throw error
    }

    // Only now, after the database has committed, is it safe to destroy the old
    // objects. The previous implementation removed them first, so a failed upload
    // left the product with no image at all.
    await deleteImages(orphanedPaths)

    revalidateCatalog(slug)
    if (existing.slug !== slug) revalidatePath(`/products/${existing.slug}`)

    return { ok: true, message: 'Product updated.' }
  })
}

export async function deleteProduct(productId: number): Promise<ActionResult> {
  return guarded(async () => {
    const [existing] = await db
      .select({ id: products.id, slug: products.slug })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)

    if (!existing) return { ok: false, message: 'That product no longer exists.' }

    const [sold] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(orderItems)
      .where(eq(orderItems.productId, productId))

    // A product that has been sold is archived rather than deleted, so historical
    // orders keep their link to it.
    if ((sold?.total ?? 0) > 0) {
      await db
        .update(products)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(eq(products.id, productId))

      revalidateCatalog(existing.slug)
      return {
        ok: true,
        message: 'Product archived (it appears in past orders, so it was not deleted).',
      }
    }

    const images = await db
      .select({ path: productImages.path })
      .from(productImages)
      .where(eq(productImages.productId, productId))

    // Delete the row first: if storage cleanup fails afterwards the worst outcome is
    // an orphaned object, whereas the old order left a live row with no image.
    await db.delete(products).where(eq(products.id, productId))
    await deleteImages(images.map((image) => image.path))

    revalidateCatalog(existing.slug)
    return { ok: true, message: 'Product deleted.' }
  })
}

export async function setProductStatus(
  productId: number,
  status: 'draft' | 'active' | 'archived',
): Promise<ActionResult> {
  return guarded(async () => {
    const [row] = await db
      .update(products)
      .set({ status, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning({ slug: products.slug })

    if (!row) return { ok: false, message: 'That product no longer exists.' }

    revalidateCatalog(row.slug)
    return { ok: true, message: `Product moved to ${status}.` }
  })
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = categoryFormSchema.safeParse({
      name: formData.get('name'),
      description: formData.get('description') ?? undefined,
      position: formData.get('position') ?? '0',
    })

    if (!parsed.success) {
      return {
        ok: false,
        message: 'Please fix the highlighted fields.',
        fieldErrors: fieldErrorsFrom(parsed.error),
      }
    }

    const base = slugify(parsed.data.name)
    const taken = await db
      .select({ slug: categories.slug })
      .from(categories)
      .where(or(eq(categories.slug, base), like(categories.slug, `${base}-%`)))

    await db.insert(categories).values({
      name: parsed.data.name,
      slug: uniqueSlug(
        base,
        taken.map((row) => row.slug),
      ),
      description: parsed.data.description ?? null,
      position: Number(parsed.data.position),
    })

    revalidateCatalog()
    revalidatePath('/admin/categories')
    return { ok: true, message: 'Category created.' }
  })
}

export async function updateCategory(
  categoryId: number,
  formData: FormData,
): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = categoryFormSchema.safeParse({
      name: formData.get('name'),
      description: formData.get('description') ?? undefined,
      position: formData.get('position') ?? '0',
    })

    if (!parsed.success) {
      return {
        ok: false,
        message: 'Please fix the highlighted fields.',
        fieldErrors: fieldErrorsFrom(parsed.error),
      }
    }

    await db
      .update(categories)
      .set({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        position: Number(parsed.data.position),
        updatedAt: new Date(),
      })
      .where(eq(categories.id, categoryId))

    revalidateCatalog()
    revalidatePath('/admin/categories')
    return { ok: true, message: 'Category updated.' }
  })
}

export async function deleteCategory(categoryId: number): Promise<ActionResult> {
  return guarded(async () => {
    // Products fall back to "uncategorised" via ON DELETE SET NULL rather than
    // disappearing with the category.
    await db.delete(categories).where(eq(categories.id, categoryId))

    revalidateCatalog()
    revalidatePath('/admin/categories')
    return { ok: true, message: 'Category deleted.' }
  })
}

/** Category options for the product form. */
export async function listCategoryOptions() {
  await requireAdmin()
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.name))
}
