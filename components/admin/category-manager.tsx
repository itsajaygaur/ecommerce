'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, PencilIcon, PlusIcon, TagsIcon, Trash2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createCategory, deleteCategory, updateCategory } from '@/lib/actions/admin-products'

type Category = {
  id: number
  name: string
  slug: string
  description: string | null
  position: number
  productCount: number
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<{ ok: boolean; message: string }>, onDone?: () => void) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        toast.success(result.message)
        onDone?.()
      } else {
        toast.error(result.message)
      }
      router.refresh()
    })
  }

  return (
    <>
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.productCount
                ? `${deleting.productCount} product(s) will become uncategorised. They stay on the storefront.`
                : 'This category has no products.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault()
                if (deleting)
                  run(
                    () => deleteCategory(deleting.id),
                    () => setDeleting(null),
                  )
              }}
            >
              {pending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>All categories</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex size-12 items-center justify-center bg-muted">
                  <TagsIcon className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No categories yet. Add one on the right.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {categories.map((category) => (
                  <li key={category.id} className="py-3 first:pt-0 last:pb-0">
                    {editingId === category.id ? (
                      <form
                        action={(formData) =>
                          run(
                            () => updateCategory(category.id, formData),
                            () => setEditingId(null),
                          )
                        }
                        className="space-y-3"
                      >
                        <Input
                          name="name"
                          defaultValue={category.name}
                          required
                          aria-label="Name"
                        />
                        <Textarea
                          name="description"
                          defaultValue={category.description ?? ''}
                          rows={2}
                          placeholder="Description"
                          aria-label="Description"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            name="position"
                            type="number"
                            defaultValue={category.position}
                            className="w-24"
                            aria-label="Position"
                          />
                          <Button type="submit" size="sm" disabled={pending}>
                            {pending && <Loader2Icon className="animate-spin" />}
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                          >
                            <XIcon />
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            /{category.slug} · {category.productCount}{' '}
                            {category.productCount === 1 ? 'product' : 'products'}
                          </p>
                          {category.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Edit ${category.name}`}
                            onClick={() => setEditingId(category.id)}
                          >
                            <PencilIcon />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Delete ${category.name}`}
                            className="hover:text-destructive"
                            onClick={() => setDeleting(category)}
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add category</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={(formData) => run(() => createCategory(formData))}
              className="space-y-3"
              key={categories.length}
            >
              <div className="space-y-1.5">
                <Label htmlFor="new-category-name">Name</Label>
                <Input id="new-category-name" name="name" required placeholder="Outerwear" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-category-description">Description</Label>
                <Textarea
                  id="new-category-description"
                  name="description"
                  rows={3}
                  placeholder="Optional, shown on the category tile."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-category-position">Position</Label>
                <Input id="new-category-position" name="position" type="number" defaultValue={0} />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
                Add category
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
