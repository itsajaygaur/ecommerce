import Image from "next/image"
import AddToCartBtn from "@/components/AddToCartBtn"
import { getProductById, getProducts } from "@/app/actions"
import { generateImageUrl } from "@/lib/utils"

export default async function ProductSlug({params}: any){

    // console.log('params' , params)

    const id = params.slug

    // const response = await getProducts()
    const response = await getProductById(id)
    if(!response.success) return <p className="text-center text-2xl mt-10" >{response.message || "Something went wrong!"}</p>
    let selectedProduct = response.data

    // const selectedProduct = allProducts?.find((item:Product) => item.id === +id)

    // console.log('selected-product', selectedProduct)

    return(
        <section className="max-w-[95%] mx-auto pb-8" >
            <div className="max-w-4xl mx-auto" >

                {
                    selectedProduct &&
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6" >
                        <div className="basis-[50%]" >
                            <Image className=" mx-auto w-full object-cover aspect-[375/563]" src={generateImageUrl(selectedProduct?.image)} width={400} height={400} alt="product image" />
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