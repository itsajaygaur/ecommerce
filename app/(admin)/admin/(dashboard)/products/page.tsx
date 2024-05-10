import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import ProductTable from "../_components/ProductTable";
import { getProducts } from "@/app/actions";
import { getProductBySearchParams } from "@/app/actions";
import db from "@/db/drizzle";
import { products } from "@/db/schema";
import { count } from "drizzle-orm";
import { Product } from "@/types";

export default async function ProductPage({searchParams}: {searchParams: {page: string}}) {

  const {page} = searchParams
  
  const result = await getProductBySearchParams(page)
  if(!result.success) return <p>{result.message}</p>

  const data = result?.data
  // console.log('data -> ', data);
  // const totalProductCount = await db.select({count: count()}).from(products)

  // console.log(' -> ', totalProductCount);
  
  // const data = result?.data


  return (
    <div className="mt-6">
      <div className="flex justify-between items-center gap-4 mb-6">
        <h2 className="text-3xl font-semibold">Products</h2>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="mr-2" size={16} /> Add new
          </Button>
        </Link>
      </div>
      <ProductTable products={data?.data!} totalProductCount={data?.totalCount[0].count} currentPage={page} />
      {/* <ProductTable products={data!}  /> */}
    </div>
  );
}
