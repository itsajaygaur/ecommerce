import Image from "next/image"
import { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import AddToCartBtn from "@/components/AddToCartBtn"
import { getProducts } from "@/app/actions"
import { generateImageUrl } from "@/lib/utils"

export default async function ProductSlug({params}: any){

    // console.log('params' , params)

    const id = params.slug

    const response = await getProducts()
    if(!response.success) return <p>{response.message || "Something went wrong!"}</p>
    let allProducts = response.data 

    const selectedProduct = allProducts?.find((item:Product) => item.id === +id)

    // console.log('selected-product', selectedProduct)

    return(
        <section className="max-w-[95%] mx-auto" >
            <div className="max-w-4xl mx-auto" >

                {
                    selectedProduct &&
                    <div className="flex gap-6" >
                        <div className="basis-[50%]" >
                            <Image className=" mx-auto w-full" src={generateImageUrl(selectedProduct?.image)} width={400} height={400} alt="product image" />
                        </div>
                        <div className="basis-[50%]" >
                            <h2 className="text-2xl mb-1" >{selectedProduct.title}</h2>
                            <p className="mb-4" >{selectedProduct.description}</p>
                            <p className="text-xl " ><span>₹</span>{selectedProduct.price}</p>
                            {/* <Button className="mt-36 py-7 text-lg rounded-none w-full" >Add to Cart</Button> */}
                            <AddToCartBtn product={selectedProduct} />
                        </div>
                    </div>

}
</div>
        </section>
    )
}