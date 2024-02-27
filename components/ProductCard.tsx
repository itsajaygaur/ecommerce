"use client"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"
import { useCart, useCartSlide } from "@/hooks/use-cart"
import { Product } from "@/app/type"


export default function ProductCard({product}: {product: Product}){

    const {addItem} = useCart()
    const {open} = useCartSlide()



    return(
        <Link href={`/product/${product.id}`} className="inline-block w-full" >
            <div className="w-full bg-gray-200 p-4 " >
                <Image className=" w-full aspect-square object-contain mix-blend-multiply " src={product.image} width={288} height={288} alt={product.title} />
            </div>
            <TooltipProvider  delayDuration={200} >
            <Tooltip>
                <TooltipTrigger asChild>
                <h2 className="mt-2 overflow-ellipsis overflow-hidden whitespace-nowrap" >{product.title}</h2>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs rounded-none" >
                    <p>{product.title}</p>
                </TooltipContent>
            </Tooltip>
            </TooltipProvider>
            <div className="flex justify-between items-center gap-4 px-1" >
                <p className="font-semibold" > <span>₹</span> {product.price}</p>
                {/* <Button onClick={() => {addItem(product); open(true)}} variant="link" >Add to cart</Button> */}
            </div>
        </Link>
    )
}