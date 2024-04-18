"use client"

import { checkout } from "@/app/actions"
import {Button} from "@/components/ui/button"
import { Product } from "@/types"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"


export default function Checkout({cartItems}: {cartItems: Product[]} ){

    const [loading, setLoading] = useState(false)

    async function checkoutHandler(){
        try {
            setLoading(true)
            const siteUrl = window.location.origin
            await checkout(cartItems, siteUrl)
        } catch (error) {
            toast.error('Something went wrong!')
            console.log('Something went wrong!')
        }finally{
            setLoading(false)
        }
    }

    return (
        <Button onClick={checkoutHandler} disabled={loading} className="rounded-none w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Checkout
        </Button>
    )
}