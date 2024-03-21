"use server"
import ProductCard from '@/components/ProductCard'
import Navbar from '@/components/Navbar'
import { Product } from '@/lib/types'
import Image from 'next/image'

export default async function Home({params, searchParams}: any) {


  const response = await fetch('https://fakestoreapi.com/products')
  let allProducts = await response.json()

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
          allProducts && allProducts.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
            ))
          }
      </div>
    </div>
      </>
  );
}
