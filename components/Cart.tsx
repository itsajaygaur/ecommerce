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
export default async function Cart(){

    const response = await fetch('https://fakestoreapi.com/products')
    const allProducts = await response.json()
    const product = allProducts[0];

    return(
        <Sheet>
        <SheetTrigger asChild className="" >
          <Button variant="ghost" size="icon">
            <ShoppingCart />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>My cart</SheetTitle>
          </SheetHeader>

          {/* <div className="flex gap-4 items-center justify-center flex-col mt-32">
            <ShoppingCart size={132} />
            <p>Your cart is empty</p>
          </div> */}

          <div className="mt-10 flex justify-between gap-2 border-b-2 pb-4" >
            {/* <Image className="aspect-square w-fit object-contain" src={product.image} width={60} height={60} alt={product.name} /> */}

            <div className=" bg-gray-200 rounded-md shrink-0 " >
                <Image className=" aspect-square object-contain mix-blend-multiply " src={product.image} width={70} height={70} alt={product.title} />
            </div>

            <div className="flex-none" >
                <p>Ratings: {product.rating.rate}</p>
                <p>{product.category}</p>
            </div>

            <div>
                <p className="text-lg font-semibold" ><span>₹</span>{product.price}</p>
            </div>

          </div>

          <SheetFooter>
            {/* <SheetClose asChild>
                <Button type="submit">Ok</Button>
            </SheetClose> */}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
}