'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArchiveIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
} from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteProduct, setProductStatus } from '@/lib/actions/admin-products'

export function ProductRowActions({
  productId,
  slug,
  title,
  status,
}: {
  productId: number
  slug: string
  title: string
  status: 'draft' | 'active' | 'archived'
}) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
      setConfirmOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If the product appears in any past order it will be archived
              instead, so order history stays intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault()
                run(() => deleteProduct(productId))
              }}
            >
              {pending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${title}`}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/admin/products/${productId}`}>
              <PencilIcon />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/products/${slug}`} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              View on storefront
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {status !== 'active' && (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() => run(() => setProductStatus(productId, 'active'))}
            >
              <SendIcon />
              Publish
            </DropdownMenuItem>
          )}
          {status !== 'archived' && (
            <DropdownMenuItem
              disabled={pending}
              onSelect={() => run(() => setProductStatus(productId, 'archived'))}
            >
              <ArchiveIcon />
              Archive
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
