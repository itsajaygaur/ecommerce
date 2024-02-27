"use client"
import {Button} from "./ui/button"
import { useCart, useCartSlide } from "@/hooks/use-cart"
import { Product } from "@/app/type"

export default function AddToCartBtn({product}:{product:Product}) {

    const {addItem} = useCart()
    const {open} = useCartSlide()

    return(
        <Button onClick={() => {addItem(product); open(true)}} className="mt-36 py-7 text-lg rounded-none w-full" >Add to Cart</Button>
    )
}