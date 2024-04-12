"use client"
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Image from "next/image";
import { useCart } from "@/hooks/use-cart";
import { useCartSlide } from "@/hooks/use-cart";
import { generateImageUrl } from "@/lib/utils";



export default function Cart(){

    // const response = await fetch('https://fakestoreapi.com/products')
    // const allProducts = await response.json()
    // const product = allProducts[0];
    const {isOpened, open} = useCartSlide()

    const {items, clearCart} = useCart()

    return(
        <Sheet open={isOpened} onOpenChange={open} >
        <SheetTrigger asChild className=""  >
          <Button variant="outline" size="icon" >
            <ShoppingCart size={20} />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col justify-between" >
          <div>
          <SheetHeader>
            <SheetTitle>My cart</SheetTitle>
          </SheetHeader>



          {
            items.length > 0 ? items.map(item => (

            <div key={item.id} className="mt-10 flex justify-between gap-2 border-b-2 pb-4" >
              {/* <Image className="aspect-square w-fit object-contain" src={product.image} width={60} height={60} alt={product.name} /> */}

              <div className=" bg-gray-200 shrink-0 p-1 " >
                  <Image className=" aspect-square object-contain mix-blend-multiply " src={generateImageUrl(item?.image)} width={70} height={70} alt={item.title} />
              </div>

              <div className="flex-none" >
                  {/* <p>Ratings: {item.rating.rate}</p> */}
                  <p>{item.category}</p>
              </div>

              <div>
                  <p className="text-lg font-semibold" ><span>₹</span>{item.price}</p>
              </div>
              <div>
                {item?.quantity && <p>{item.quantity}</p> }
              </div>

            </div>
            ))
            :
          <div className="flex gap-4 items-center justify-center flex-col mt-32">
            <ShoppingCart size={132} />
            <p>Your cart is empty</p>
          </div> 

}
</div>



          <SheetFooter>
            <div className="flex-grow" >
              <Button variant="link" onClick={() => clearCart() } className="" >Empty Cart</Button>
            </div>
            {/* <SheetClose asChild  >
                <Button type="submit">Ok</Button>
            </SheetClose> */}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
}