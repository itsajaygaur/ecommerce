'use server'
import { redirect } from "next/navigation"
import db from "@/db/drizzle"
import { products } from "@/db/schema"
import { productSchema } from "@/types/zodSchemas"
import { Product } from "@/types"
import { createClient } from '@supabase/supabase-js'
import {z} from "zod"
import { revalidatePath } from "next/cache"
import { count, eq } from "drizzle-orm"
import { encrypt } from "@/lib/auth"
import { cookies } from "next/headers"
import { isValidPassowrd } from "@/lib/isValidPassword"
import {Stripe} from "stripe"
import { generateImageUrl } from "@/lib/utils"



const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)


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
        // revalidatePath('/')
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
        if(!allProducts) return {success: false, message: "Failed to get data!"}
        return {success: true, data: allProducts}
    } catch (error) {
        console.log('err -> ', error)
        return {success: false, message: "Failed to get data!"}
    }
}

export async function getProductById(id: number){
    try {
        const product = await db.select().from(products).where(eq(products.id, id))
        // console.log('product -> ', product)
        if(!product) return {success: false, message: "Failed to get data!"}
        if(product.length === 0) return {success: false, message: "Product not found!"}
        return {success: true, data: product[0]}
    } catch (error) {
        return {success: false, message: "Failed to get data!"}
    }
}

export async function login({username = '', password = ''}: {username: string, password: string} ){
    try {
        if(!username || !password) return {success: false, message: "Please provide login and password"}

        if(username === process.env.ADMIN_USERNAME && await isValidPassowrd(password, process.env.ADMIN_HASHED_PASSWORD as string)){
            const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
            const token = await encrypt({username, expires})
            cookies().set('session', token, {expires, httpOnly: true, secure: process.env.NODE_ENV === 'production' })
            return {success: true, message: "Logged in successfully"}
        }

        return {success: false, message: "Invalid username or password"}

    } catch (error) {
        console.log('err -> ', error)
        return {success: false, message: "Something went wrong. Please try again later."}
    }
}

export async function logout(){
        cookies().delete('session')
        redirect('/admin/login')
    
}

export async function checkout(cartItems:  Product[], siteUrl: string){
    let session: any
    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

        const lineItems = cartItems.map(item => (
            {

                price_data: {
                    currency: 'inr',
                        product_data: {
                        name: item.title,
                        images: [generateImageUrl(item.image)],
                        },
                        unit_amount: item.price * 100,
                        
                },
                quantity: item.quantity,
                
            }
        ))
    
        session = await stripe.checkout.sessions.create({
            // line_items: [{
            //     price_data: {
            //         currency: 'inr',
            //          product_data: {
            //             name: 'tes product',
            //          },
            //          unit_amount: 2000,
            //     },
            //     quantity: 1,
            // }],
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${siteUrl}/`,
            
        })
            // redirect(session.url as string)
        
    } catch (error) {
        console.log('err -> ', error)
        return {success: false, message: "Something went wrong. Please try again later."}
    }
    console.log('session -> ', session)
    redirect(session.url as string)
}

export async function getProductBySearchParams(page = '1'){
    try {
        // const result = await db.select().from(products).offset((Number(page) - 1) * 5).limit(5)
        const result = await db.transaction(async tx => {
            const data = await tx.select().from(products).offset((Number(page) - 1) * 10).limit(10)
            const totalCount = await tx.select({count: count()}).from(products)
            return {data, totalCount}

        })

        return {success: true, data: result}
    } catch (error) {
        console.log('err -> ', error)
        return {success: false, message: "Failed to get data!"}
    }
}