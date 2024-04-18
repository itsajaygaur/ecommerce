"use client";
import { ShoppingCart, X } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
// import {seperator} from "@/components/ui/separator"
import { Separator } from "@/components/ui/separator";
import { checkout } from "@/app/actions";
import Checkout from "./Checkout";

export default function Cart() {

  const { isOpened, open } = useCartSlide();

  const { items, clearCart, quantity, removeItem } = useCart();

  const totalPrice = items.map((item) => item.quantity ? item.price * item.quantity : item.price ).reduce((a, b) => a + b, 0)

  return (
    <Sheet open={isOpened} onOpenChange={open}>
      <SheetTrigger asChild className="">
        <Button className="relative rounded-none" variant="outline" size="icon">
          <ShoppingCart size={20} />
          {items.length > 0 && (
            <span className="text-sm absolute -top-2 -right-2 bg-red-600/35 rounded-full size-5">
              {items.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col justify-between w-screen min-[425px]:max-w-sm ">
        {/* <div > */}
        <SheetHeader>
          <SheetTitle>My cart</SheetTitle>
        </SheetHeader>

        <SheetClose className="absolute right-4 top-4 rounded-none opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-zinc-100 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300 dark:data-[state=open]:bg-zinc-800">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
      </SheetClose>

        <ScrollArea className="overflow-y-auto h-full">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="mt-8 first:mt-5 flex gap-2 border-b-2 pb-3"
              >
                {/* <Image className="aspect-square w-fit object-contain" src={product.image} width={60} height={60} alt={product.name} /> */}

                {/* <div className=" shrink-0 p-1 "> */}
                <Image
                  className="flex-[0_0_20%] object-cover aspect-[375/563] "
                  src={generateImageUrl(item?.image)}
                  width={70}
                  height={70}
                  alt={item.title}
                />
                {/* </div> */}

                <div className="ml-4 w-full">
                  <div className="flex-none mb-3">
                    {/* <p>Ratings: {item.rating.rate}</p> */}
                    <p>{item.title}</p>
                  </div>

                  <div className="flex items-center justify-between gap-4">
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
                            className="size-10 leading-10 text-gray-600 rounded-none"
                            onClick={() =>
                              item.quantity === 1
                                ? removeItem(item.id)
                                : quantity(item.id, "DECREASE")
                            }
                          >
                            &minus;
                          </Button>

                          <p className="">{item.quantity}</p>

                          <Button
                            variant="ghost"
                            className="size-10 leading-10 text-gray-600 rounded-none"
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

        <SheetFooter > 
          {
            items.length > 0 &&
           <div className="flex flex-col w-full" >
            <div className="flex-grow flex justify-between items-center mb-1" >
              <p>Total</p>
              <p>₹{totalPrice}</p>
            </div>
            <Separator className="h-0.5 text-gray-400" />
            <div className=" mt-4 space-y-2">

              <Checkout cartItems={items} />

              {/* <form action={checkout} >
                <Button className="rounded-none w-full">Checkout</Button>
              </form> */}

              <Button variant="link" onClick={() => clearCart()} className="w-full">
                Empty Cart
              </Button>
            </div>
          </div>
          }
          {/* <SheetClose asChild  >
                <Button type="submit">Ok</Button>
            </SheetClose> */}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
