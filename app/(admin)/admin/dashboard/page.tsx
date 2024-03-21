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
import { productSchema } from "@/lib/types"
import {z} from "zod"
import { addProduct } from "@/app/actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"


export default function Dashboard(){

const form = useForm<z.infer<typeof productSchema>>({resolver: zodResolver(productSchema), defaultValues: {
    title: "",
    description: "",
    price: "",
    category: "",
    image: undefined
}})

const fileRef = form.register("image");

async function submitProduct(data: z.infer<typeof productSchema>){

    // console.log('data -', data)
    // return
    try {
        const formData = new FormData()
        data.image = data.image[0]
    
        Object.entries(data).map(([key, value]) => {
            formData.append(key, value)
        })
    
        const res = await addProduct( formData)
        if(res.success){
            form.reset()
            toast.success(res.message)
            return
        }
        toast.error("Something went wrong", {description: "Please try again later"})
    } catch (error) {
        toast.error("Something went wrong", {description: "Please try again later"})
    }
}

    
    return(
        <section className="max-w-xl mx-auto mt-20" >

            <Form {...form} >

                <form onSubmit={form.handleSubmit(submitProduct)} className="flex flex-col gap-5" >

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

                    <FormField 
                        control={form.control}
                        name="image"
                        render={({field}) => (
                            <FormItem >
                                <FormLabel></FormLabel>
                                <FormControl  >
                                    <Input type="file"  {...fileRef}  />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        ) }
                    />

                    <Button type="submit" disabled={form.formState.isSubmitting} >
                        
                        { 
                        form.formState.isSubmitting ? 
                        <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
                        : 
                        "Add Product"
                        }
                    </Button>
                </form>
            </Form>

        </section>
    )
}