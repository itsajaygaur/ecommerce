"use server"
import ProductCard from '@/components/ProductCard'
import Navbar from '@/components/Navbar'
export default async function Home() {


  const response = await fetch('https://fakestoreapi.com/products')
  const allProducts = await response.json()

  return (
    <div className='max-w-[95%] mx-auto' >

    <Navbar />
    <div className='grid grid-cols-4 gap-6 place-items-center ' >
        {
        allProducts && allProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))
        }
      </div>
    </div>
  );
}
