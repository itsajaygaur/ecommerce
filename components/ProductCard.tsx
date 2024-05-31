import Image from "next/image";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Product } from "@/types";
import { generateImageUrl } from "@/lib/utils";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`} className="inline-block w-full">
      <div className=" ">
        <Image
          className=" w-full object-cover aspect-[375/563] "
          src={generateImageUrl(product?.image)}
          width={375}
          height={563}
          alt={product.title}
        />
      </div>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger className="mt-2" asChild>
            <h2 className="text-xs overflow-ellipsis overflow-hidden whitespace-nowrap">
              {product.title}
            </h2>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{product.title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <div className="flex justify-between items-center gap-4 px-1">
        <p className="">
          {" "}
          <span>₹</span> {product.price}
        </p>
        {/* <Button onClick={() => {addItem(product); open(true)}} variant="link" >Add to cart</Button> */}
      </div>
    </Link>
  );
}
