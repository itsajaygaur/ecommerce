import { z } from 'zod'
import { MAX_IMAGE_BYTES } from '@/lib/storage'

/**
 * Product input validation, shared by the browser form and the Server Action.
 *
 * The old code had two nearly identical schemas (`productSchema` and
 * `updateProductSchema`) that differed only in whether an image was required — and
 * neither was ever applied on the server, so every field arrived unvalidated. There
 * is one schema now, and the action runs it before touching the database.
 */

const priceField = z
  .string()
  .trim()
  .min(1, 'Enter a price')
  .refine((value) => {
    const numeric = Number(value.replace(/[^\d.]/g, ''))
    return Number.isFinite(numeric) && numeric >= 0
  }, 'Enter a valid price')

export const productFormSchema = z.object({
  title: z.string().trim().min(2, 'Give the product a title').max(200, 'Title is too long'),
  description: z.string().trim().max(5000, 'Description is too long').default(''),
  price: priceField,
  compareAtPrice: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === '' ? undefined : value))
    .refine(
      (value) => value === undefined || Number.isFinite(Number(value.replace(/[^\d.]/g, ''))),
      'Enter a valid compare-at price',
    ),
  stock: z
    .string()
    .trim()
    .default('0')
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 0,
      'Stock must be a whole number',
    ),
  categoryId: z.string().trim().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  featured: z
    .union([z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')])
    .optional(),
  slug: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === '' ? undefined : value))
    .refine(
      (value) => value === undefined || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
      'Use lowercase letters, numbers and hyphens only',
    ),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, 'Give the category a name').max(100, 'Name is too long'),
  description: z.string().trim().max(500, 'Description is too long').optional(),
  position: z
    .string()
    .trim()
    .default('0')
    .refine((value) => Number.isInteger(Number(value)), 'Position must be a whole number'),
})

/** Client-side file check, mirroring the server rules in `lib/storage.ts`. */
export const imageFileSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size <= MAX_IMAGE_BYTES,
    `Images must be under ${MAX_IMAGE_BYTES / 1024 / 1024}MB`,
  )
  .refine((file) => file.type.startsWith('image/'), 'Only image files are allowed')
