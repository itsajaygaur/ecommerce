'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ImagePlusIcon, Loader2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createProduct, updateProduct } from '@/lib/actions/admin-products'
import { minorUnitsToInput } from '@/lib/money'
import { slugify } from '@/lib/slug'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/storage'
import { imageUrl } from '@/lib/storage'

/**
 * Product editor.
 *
 * Replaces a form that offered only title / description / price / category / one
 * image, wrote prices as unvalidated strings and hardcoded the Supabase URL inline.
 * This exposes the full model, previews multiple images before upload, and lets the
 * server own validation — errors come back per-field from the same Zod schema.
 */

export type ProductFormProduct = {
  id: number
  slug: string
  title: string
  description: string
  priceCents: number
  compareAtPriceCents: number | null
  currency: string
  stock: number
  status: 'draft' | 'active' | 'archived'
  featured: boolean
  categoryId: number | null
  images: { id: number; path: string; alt: string | null }[]
}

type Props = {
  product?: ProductFormProduct
  categories: { id: number; name: string }[]
}

export function ProductForm({ product, categories }: Props) {
  const router = useRouter()
  const isEdit = Boolean(product)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [title, setTitle] = useState(product?.title ?? '')
  const [slug, setSlug] = useState(product?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(product))
  const [status, setStatus] = useState(product?.status ?? 'draft')
  const [categoryId, setCategoryId] = useState(
    product?.categoryId ? String(product.categoryId) : 'none',
  )

  const [newFiles, setNewFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState(product?.images ?? [])
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([])

  function addFiles(files: FileList | null) {
    if (!files) return
    const accepted: File[] = []

    for (const file of Array.from(files)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported image type.`)
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name} is larger than ${MAX_IMAGE_BYTES / 1024 / 1024}MB.`)
        continue
      }
      accepted.push(file)
    }

    setNewFiles((current) => [...current, ...accepted])
  }

  function submit(formData: FormData) {
    setFieldErrors({})

    // The file input is cleared as files are staged, so attach the staged set.
    formData.delete('images')
    for (const file of newFiles) formData.append('images', file)
    for (const id of removedImageIds) formData.append('removeImageIds', String(id))

    if (categoryId === 'none') formData.delete('categoryId')

    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, formData)
        : await createProduct(formData)

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {})
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      router.push('/admin/products')
      router.refresh()
    })
  }

  return (
    <form action={submit} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Title" htmlFor="title" error={fieldErrors.title}>
              <Input
                id="title"
                name="title"
                required
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value)
                  // Derive the slug until the author edits it themselves.
                  if (!slugTouched) setSlug(slugify(event.target.value))
                }}
                placeholder="Oxford Shirt in Brushed Cotton"
              />
            </Field>

            <Field
              label="URL slug"
              htmlFor="slug"
              error={fieldErrors.slug}
              hint={slug ? `/products/${slug}` : 'Generated from the title'}
            >
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  setSlug(event.target.value)
                }}
                placeholder="oxford-shirt"
              />
            </Field>

            <Field label="Description" htmlFor="description" error={fieldErrors.description}>
              <Textarea
                id="description"
                name="description"
                rows={7}
                defaultValue={product?.description ?? ''}
                placeholder="What it is, what it's made of, and how it wears in."
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>
              The first image is used as the primary. Up to {MAX_IMAGE_BYTES / 1024 / 1024}MB each.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {existingImages.map((image) => (
                <ImageTile
                  key={`existing-${image.id}`}
                  src={imageUrl(image.path)}
                  onRemove={() => {
                    setExistingImages((current) => current.filter((i) => i.id !== image.id))
                    setRemovedImageIds((current) => [...current, image.id])
                  }}
                />
              ))}

              {newFiles.map((file, index) => (
                <ImageTile
                  key={`new-${file.name}-${index}`}
                  src={URL.createObjectURL(file)}
                  isNew
                  onRemove={() => setNewFiles((current) => current.filter((_, i) => i !== index))}
                />
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border-input hover:border-ring hover:bg-secondary/50 text-muted-foreground flex aspect-(--aspect-product) flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed transition-colors"
              >
                <ImagePlusIcon className="size-5" />
                <span className="text-xs">Add image</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              name="images"
              multiple
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files)
                // Reset so re-selecting the same file still fires a change event.
                event.target.value = ''
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Price (₹)" htmlFor="price" error={fieldErrors.price}>
              <Input
                id="price"
                name="price"
                inputMode="decimal"
                required
                defaultValue={
                  product ? minorUnitsToInput(product.priceCents, product.currency) : ''
                }
                placeholder="2499"
              />
            </Field>

            <Field
              label="Compare-at price (₹)"
              htmlFor="compareAtPrice"
              error={fieldErrors.compareAtPrice}
              hint="Shown struck through when higher than the price."
            >
              <Input
                id="compareAtPrice"
                name="compareAtPrice"
                inputMode="decimal"
                defaultValue={
                  product?.compareAtPriceCents
                    ? minorUnitsToInput(product.compareAtPriceCents, product.currency)
                    : ''
                }
                placeholder="3199"
              />
            </Field>

            <Field label="Stock" htmlFor="stock" error={fieldErrors.stock}>
              <Input
                id="stock"
                name="stock"
                type="number"
                min={0}
                step={1}
                defaultValue={product?.stock ?? 0}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as typeof status)}
                name="status"
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft — hidden from the storefront</SelectItem>
                  <SelectItem value="active">Active — visible and purchasable</SelectItem>
                  <SelectItem value="archived">Archived — removed from the storefront</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="status" value={status} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="Uncategorised" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorised</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryId !== 'none' && (
                <input type="hidden" name="categoryId" value={categoryId} />
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox id="featured" name="featured" defaultChecked={product?.featured} />
              <Label htmlFor="featured" className="text-sm font-normal">
                Feature on the home page
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="flex-1">
            {pending && <Loader2Icon className="animate-spin" />}
            {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </Button>
          <Button type="button" variant="outline" asChild disabled={pending}>
            <Link href="/admin/products">Cancel</Link>
          </Button>
        </div>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  )
}

function ImageTile({
  src,
  onRemove,
  isNew = false,
}: {
  src: string
  onRemove: () => void
  isNew?: boolean
}) {
  return (
    <div className="bg-muted relative aspect-(--aspect-product) overflow-hidden rounded-md border">
      {isNew ? (
        // A blob: URL from the file picker cannot go through the image optimiser.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <Image src={src} alt="" fill sizes="8rem" className="object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="bg-background/90 hover:bg-destructive hover:text-destructive-foreground absolute top-1.5 right-1.5 rounded-full p-1 shadow-sm transition-colors"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  )
}
