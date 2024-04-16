import { products } from "@/db/schema";
import AddProductForm from "../../../_components/AddProductForm";
import db from "@/db/drizzle";
import { eq } from "drizzle-orm";

export default async function ProductEdit({params: {id}}: {params: {id: string}}){

    const product = await db.select().from(products).where(eq(products.id, Number(id)))

    return <div className="max-w-5xl mx-auto py-10" >
        <AddProductForm product={product[0]} />
    </div>
}