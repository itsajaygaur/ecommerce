'use server'
import { redirect } from "next/navigation"
import db from "@/db/drizzle"
import { products } from "@/db/schema"
import { Product, productSchema } from "@/lib/types"
import { createClient } from '@supabase/supabase-js'
import {z} from "zod"
import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"



const supabase = createClient('https://kzboeyfgixrlsgzaanot.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Ym9leWZnaXhybHNnemFhbm90Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMDUyNjAyNywiZXhwIjoyMDI2MTAyMDI3fQ.0oxswoit5pskiV3bx64883eM5rX5WtLKDH3AxV7EyzU')


export type State = {
    success: boolean,
    message: string
}





export async function addToCart(){
    const response = await fetch('')
}

export async function search(formData: FormData){
    "use server"
      const query = formData.get('query')
      if(!query) redirect('/')
      redirect(`/?q=${query}`)
  }


export async function addProduct(formData: FormData): Promise<State>{

    // const product = Object.fromEntries(formData)
    try {
        
        const product = {
            title: formData.get('title') as string,
            price: formData.get('price'),
            description: formData.get('description') as string,
            category: formData.get('category') as string,
            image: formData.get('image') as File,
        }
        const productImage = product.image

        type Data = { path: string, id: string, fullPath: string}
        
        const { data, error } = await supabase.storage.from('ecommerce').upload(productImage.name, productImage)
        if(error) return {success: false, message: error.message}
    
    
        const dataToSave = {
            ...product, 
                image: productImage.name,
                price: Number(product.price) 
        }
    
        
        const addData = await db.insert(products).values(dataToSave)
        if(!addData){
            await supabase.storage.from('ecommerce').remove([(data as Data).fullPath])
            return {success: false, message: "Failed to add product"} 
        } 
        revalidatePath('/admin/products')
        return {success: true, message: "Product added successfully"}
    } catch (error) {
        return {success: false,  message: 'Something went wrong. Please try again later.'}
    }
}

export async function updateProduct(formData: FormData, oldProduct: Product): Promise<State>{
    try {
        const product = {
            title: formData.get('title') as string,
            price: formData.get('price'),
            description: formData.get('description') as string,
            category: formData.get('category') as string,
            // image: formData.get('image') as File,
        }

        const productImage = formData.get('image') as File

        // console.log('product-data', product)
        // return {success: false, message: "checking"}
        
        type Data = { path: string, id: string, fullPath: string}
        
        let dataToUpdate: any = { ...product, price: Number(product.price) }
        if(productImage && productImage as any !== 'undefined'){
            dataToUpdate.image = productImage.name
            const { data, error } = await supabase.storage.from('ecommerce').upload(productImage.name, productImage)
            await supabase.storage.from('ecommerce').remove([oldProduct.image])
            if(error) return {success: false, message: error.message}

        }
        
        const updateData = await db.update(products).set(dataToUpdate).where(eq(products.id, Number(oldProduct.id)))
        if(!updateData){
            await supabase.storage.from('ecommerce').remove([productImage.name])
            return {success: false, message: "Failed to add product"} 
        } 
        revalidatePath('/admin/products')
        return {success: true, message: "Product added successfully"}

    } catch (error) {
        return {success: false, message: "Something went wrong. Please try again later."}
    }
}

export async function deleteProduct(id: number, image: string){
    try {
        if(!id || !image) return {success: false, message: "Provide details to delete product"}

        const {data, error} = await supabase.storage.from('ecommerce').remove([image])
        if(error) return {success: false, message: error.message}

        const deleteProduct = await db.delete(products).where(eq(products.id, id))

        if(!deleteProduct) return {success: false, message: "Failed to delete product"}

        revalidatePath('/admin/products')
        return {success: true, message: "Product deleted successfully"}

    } catch (error) {
        return {success: false, message: "Something went wrong. Please try again later."}
    }
}

export async function getProducts(){
    try {
        const allProducts = await  db.select().from(products)
        return {success: true, data: allProducts}
    } catch (error) {
        console.log('err -> ', error)
        return {success: false, message: "Failed to get data!"}
    }
}