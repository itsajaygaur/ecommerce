import { Button } from "@/components/ui/button"
import AllProducts from "../_components/DbProducts"
import Link from "next/link"

export default function ProductPage(){
    return <div className="max-w-3xl mx-auto mt-20" >
      <div className="flex justify-between items-center gap-4 mb-6" >
        <h2 className="text-3xl font-semibold" >Products</h2>
        <Link href="/admin/products/new" >
          <Button >Add new product</Button>
        </Link>
        </div>  
     <AllProducts />
    </div>
}