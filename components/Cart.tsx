"use client";
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
import { ScrollArea } from "./ui/scroll-area";

export default function Cart() {
  // const response = await fetch('https://fakestoreapi.com/products')
  // const allProducts = await response.json()
  // const product = allProducts[0];
  const { isOpened, open } = useCartSlide();

  const { items, clearCart, quantity, removeItem } = useCart();

  return (
    <Sheet open={isOpened} onOpenChange={open}>
      <SheetTrigger asChild className="">
        <Button className="relative" variant="outline" size="icon">
          <ShoppingCart size={20} />
          {
            items.length > 0 &&
            <span className="text-sm absolute -top-2 -right-2 bg-red-600/35 rounded-full size-5" >{items.length}</span>
          }
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col justify-between">
        {/* <div > */}
          <SheetHeader>
            <SheetTitle>My cart</SheetTitle>
          </SheetHeader>

<ScrollArea className="overflow-y-auto h-full" >

          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="mt-8 first:mt-5 flex gap-2 border-b-2 pb-3"
              >
                {/* <Image className="aspect-square w-fit object-contain" src={product.image} width={60} height={60} alt={product.name} /> */}

                {/* <div className=" shrink-0 p-1 "> */}
                  <Image
                    className="flex-[0_0_20%] object-contain "
                    src={generateImageUrl(item?.image)}
                    width={70}
                    height={70}
                    alt={item.title}
                  />
                {/* </div> */}

                <div className="ml-4 w-full" >

                  <div className="flex-none mb-3">
                    {/* <p>Ratings: {item.rating.rate}</p> */}
                    <p>{item.title}</p>
                  </div>


<div className="flex items-center justify-between gap-4" >

                  <div>
                    <p className="text-lg font-semibold">
                      <span>₹</span>
                      {item.price}
                    </p>
                  </div>


                  <div>

                    {item.quantity && (
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          className="size-10 leading-10 text-gray-600 "
                          onClick={() => item.quantity ===  1 ? removeItem(item.id) : quantity(item.id, "DECREASE")}
                        >
                          &minus;
                        </Button>

                        <p className="">{item.quantity}</p>

                        <Button
                          variant="ghost"
                          className="size-10 leading-10 text-gray-600"
                          onClick={() => quantity(item.id, "INCREASE")}
                        >
                          +
                        </Button>
                      </div>
                    )}
                  </div>
</div>

                </div>
                {/* <div>
                {item?.quantity && <p>{item.quantity}</p> }
              </div> */}
              </div>
            ))
          ) : (
            <div className="flex gap-4 items-center justify-center flex-col mt-32">
              <ShoppingCart size={132} />
              <p>Your cart is empty</p>
            </div>
          )}
</ScrollArea>

        {/* </div> */}

        <SheetFooter>
          <div className="flex-grow flex gap-4 justify-between">
            <Button variant="link" onClick={() => clearCart()} className="">
              Empty Cart
            </Button>
            <Button className="rounded-none" >
              Checkout
            </Button>
          </div>
          {/* <SheetClose asChild  >
                <Button type="submit">Ok</Button>
            </SheetClose> */}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
