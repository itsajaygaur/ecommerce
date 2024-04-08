"use client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {useForm} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Product, productSchema, updateProductSchema } from "@/lib/types"
import {z} from "zod"
import { addProduct, updateProduct } from "@/app/actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"


export default function AddProductForm({product}: {product?: Product | null } ){

    const router = useRouter()

    const form = useForm<z.infer<typeof productSchema | typeof updateProductSchema>>({resolver: zodResolver(product ?  updateProductSchema : productSchema), defaultValues: {
        title: "",
        description: "",
        price: "",
        category: "",
        image: undefined
    }})
    
    const fileRef = form.register("image");

    const productImage = form.watch('image')


    async function submitProduct(data: z.infer<typeof productSchema>){
    
        // console.log('data -', data)
        // return
        try {
            const formData = new FormData()
            data.image = data.image[0]
        
            Object.entries(data).map(([key, value]) => {
                formData.append(key, value)
            })
        
            const res = await (product ? updateProduct(formData, product) : addProduct( formData))
            if(res.success){
                form.reset()
                router.push('/admin/products')
                toast.success(res.message)
                return
            }
            toast.error("Something went wrong", {description: "Please try again later"})
        } catch (error) {
            toast.error("Something went wrong", {description: "Please try again later"})
        }
    }

    useEffect(() => {
        if(!product) return
        form.setValue('title', product.title)
        form.setValue('description', product.description)
        form.setValue('price', JSON.stringify(product.price))
        form.setValue('category', product.category)

        // Object.entries(product).map(([key, value]) => {
        //     form.setValue(key, value)
        // } )

    }, [product])


    return (
        <Form {...form} >

        <form onSubmit={form.handleSubmit(submitProduct)} className="flex flex-col gap-5" >

        <FormField 
                control={form.control}
                name="image"
                
                render={({field}) => (
                    <FormItem >
                        <FormLabel htmlFor="file" >
            
                        <Image className="object-cover w-full aspect-video" src={ (productImage && productImage.length && URL.createObjectURL(productImage[0])) || (product?.image && `https://kzboeyfgixrlsgzaanot.supabase.co/storage/v1/object/public/ecommerce/${product?.image}`) || "/banner-kid.jpg"} width={300} height={300} alt="product image" />

                        </FormLabel>
                        <FormControl  >
                            <Input id="file" type="file"  {...fileRef} className="hidden" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                ) }
            />
        

            <FormField 
                control={form.control}
                name="title"
                render={({field}) => (
                    <FormItem>
                        <FormLabel></FormLabel>
                        <FormControl>
                            <Input placeholder="Title" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                ) }
            />
            <FormField 
                control={form.control}
                name="description"
                render={({field}) => (
                    <FormItem>
                        <FormLabel></FormLabel>
                        <FormControl>
                            <Input placeholder="Description" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                ) }
            />
            <FormField 
                control={form.control}
                name="price"
                render={({field}) => (
                    <FormItem>
                        <FormLabel></FormLabel>
                        <FormControl>
                            <Input placeholder="Price" type="number" {...field}  />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                ) }
            />

            <FormField 
                control={form.control}
                name="category"
                render={({field}) => (
                    <FormItem>
                        <FormLabel></FormLabel>
                        <FormControl>
                            <Input placeholder="Category" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                ) }
            />



            <Button type="submit" disabled={form.formState.isSubmitting} >
                
                { 
                form.formState.isSubmitting ? 
                <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                : 
                "Save"
                }
            </Button>
        </form>
    </Form>
    )
}