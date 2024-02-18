import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"
export default function ProductCard({product}: any){
    return(
        <div className=" w-full" >
            <div className="w-full bg-gray-200 p-4 rounded-md " >
                <Image className=" w-full aspect-square object-contain mix-blend-multiply " src={product.image} width={288} height={288} alt={product.title} />
            </div>
            <TooltipProvider  delayDuration={200} >
            <Tooltip>
                <TooltipTrigger asChild>
                <h2 className="mt-2 overflow-ellipsis overflow-hidden whitespace-nowrap" >{product.title}</h2>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs" >
                    <p>{product.title}</p>
                </TooltipContent>
            </Tooltip>
            </TooltipProvider>
            <div className="flex justify-between items-center gap-4 px-1" >
                <p className="font-semibold" > <span>₹</span> {product.price}</p>
                <Button variant="link" >Add to cart</Button>
            </div>
        </div>
    )
}