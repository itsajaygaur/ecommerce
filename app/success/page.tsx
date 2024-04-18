import { redirect } from "next/navigation";
import {Stripe} from "stripe"
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import ClearCart from "@/lib/clearCart";
import ClearCart from "@/components/ClearCart";


export default async function SuccessPage({searchParams}: {searchParams: {session_id: string}}){


    const {session_id} = searchParams;
    if(!session_id) return redirect('/')

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

    const session = await stripe.checkout.sessions.retrieve(session_id).catch(err => redirect('/'))
    if(!session?.customer_details?.email) return redirect('/')


    

    return(

        <section className="grid place-items-center h-lvh " >
            <ClearCart />
        <Card className="max-w-md w-full text-center max-sm:border-none rounded-none" >
            <CardHeader>
                <BadgeCheck className="text-green-500 mx-auto" size={72} />
                <CardTitle className="text-4xl" >Thank You!</CardTitle>
                <CardDescription>Payment done successfully</CardDescription>
                <CardContent className="pt-10 space-y-3 text-zinc-600 dark:text-zinc-400 px-0 *:mx-auto *:flex *:items-center *:justify-between *:max-w-sm" >
                    <div>
                        <p>Name</p>
                        <p>{session?.customer_details?.name}</p>
                    </div>
                    <div>
                        <p>Email</p>
                        <p>{session?.customer_details?.email}</p>
                    </div>
                    <div>
                        <p>Amount paid</p>
                        <p>₹{session?.amount_total && session?.amount_total / 100 }</p>
                    </div>
                </CardContent>
                <CardFooter className="pt-6" >
                    <Button className="rounded-none mx-auto" >
                        <Link href="/">Continue shopping</Link>
                    </Button>
                </CardFooter>
            </CardHeader>
            {/* <p className="text-3xl text-center mt-[10%]" >Payment Success!</p> */}
        </Card>
        </section>

    )
}