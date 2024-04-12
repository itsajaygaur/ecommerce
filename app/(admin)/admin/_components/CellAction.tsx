"use client"

import Link from "next/link";

import { Button } from "@/components/ui/button"
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {  Ellipsis } from "lucide-react";

import { Pencil, Trash2 } from 'lucide-react';
import { useState } from "react";
import { Product } from "@/lib/types";
import { deleteProduct } from "@/app/actions";

export default function CellAction({product}: {product: Product}){


    const [isOpen, setIsOpen]  = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleClick(id: number, image: string){

        try {
            setLoading(true)
            const res = await deleteProduct(id, image)

            if(res.success){
                toast.success(res.message)
                return
            }
            toast.error("Something went wrong", {description: "Please try again later"})

        } catch (error) {
            toast.error("Something went wrong", {description: "Please try again later"})
        }finally{
            setLoading(false)
            setIsOpen(false)
        }

    } 



    return(
        <>
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}  >
        <AlertDialogContent  >
        <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
        This action cannot be undone. This will permanently delete your product.
        </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setIsOpen(false)} >Cancel</AlertDialogCancel>
        {/* <AlertDialogAction  > */}
            <Button onClick={() => handleClick(product.id, product.image)} disabled={loading} variant="destructive" >
             {loading ? "Deleting...": "Delete"}
            </Button>
        {/* </AlertDialogAction> */}
        </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>




        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">
            {/* <EllipsisVertical size={18} /> */}
            <Ellipsis size={16}  />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            <Link className="flex items-center w-full h-full cursor-default" href={`/admin/products/${product.id}/edit`} >
              <Pencil className="mr-4" size={18} />
              <span>Edit</span>
            </Link>
          </DropdownMenuItem>


          <DropdownMenuItem onClick={() => setIsOpen(true)} >

            <Trash2 className="mr-4" size={18} />
            <span>Delete</span>

          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
        </>
    )
}