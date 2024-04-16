// "use server"
import ProductCard from '@/components/ProductCard'
import Navbar from '@/components/Navbar'
import { Product } from '@/types'
import Image from 'next/image'
import { getProducts } from '../actions'

export default async function Home({searchParams}: {searchParams: {q: string}}) {


  const response = await getProducts()
  if(!response.success) return <p>{response.message || "Something went wrong!"}</p>
  let allProducts = response.data 

  if(searchParams.q){
    const filteredProducts = allProducts && allProducts.filter((item: Product) => item.title.toLowerCase().includes(searchParams.q.toLowerCase()) )
    allProducts = filteredProducts
  }

  return (
    <>
    {!searchParams.q && <Image className='mb-10' priority src="/banner-2.jpg" width={1920} height={1088} alt='banner image' />}
    <div className='max-w-[95%] mx-auto' >

    <div className='grid grid-cols-4 gap-6 place-items-center ' >
        {
          allProducts && allProducts.length === 0 ? <p>No products found!</p> :
          allProducts && allProducts.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
            ))
          }
      </div>
    </div>
      </>
  );
}
