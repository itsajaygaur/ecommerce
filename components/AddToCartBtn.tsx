"use client"
import {Button} from "./ui/button"
import { useCart, useCartSlide } from "@/hooks/use-cart"
import { Product } from "@/types"

export default function AddToCartBtn({product}:{product:Product}) {

    const {addItem} = useCart()
    const {open} = useCartSlide()

    return(
        <Button variant="outline" onClick={() => {addItem(product); open(true)}} className="mt-5 sm:mt-36 py-7 text-lg w-full" >Add to Cart</Button>
    )
}