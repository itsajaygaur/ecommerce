import Image from "next/image"
import { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import AddToCartBtn from "@/components/AddToCartBtn"

export default async function ProductSlug({params}: any){

    // console.log('params' , params)

    const id = params.slug

    const response = await fetch('https://fakestoreapi.com/products')
    const allProducts = await response.json()

    const selectedProduct = allProducts.find((item:Product) => item.id === +id)

    // console.log('selected-product', selectedProduct)

    return(
        <section className="max-w-[95%] mx-auto" >
                {
                    selectedProduct &&
                    <div className="flex gap-6" >
                        <div className="basis-[65%] bg-gray-200 p-20" >
                            <Image className=" aspect-[3/4] object-contain mx-auto mix-blend-multiply" src={selectedProduct.image} width={400} height={400} alt="product image" />
                        </div>
                        <div className="basis-[35%]" >
                            <h2 className="text-3xl mb-4 font-semibold" >{selectedProduct.title}</h2>
                            <p className="text-xl" ><span>₹</span>{selectedProduct.price}</p>
                            {/* <Button className="mt-36 py-7 text-lg rounded-none w-full" >Add to Cart</Button> */}
                            <AddToCartBtn product={selectedProduct} />
                        </div>
                    </div>

                }
        </section>
    )
}