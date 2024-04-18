"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/types/zodSchemas";
import {z} from "zod"
import { login } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function LoginForm() {

  const router = useRouter()

  const form = useForm<z.infer<typeof loginSchema>>({resolver: zodResolver(loginSchema), defaultValues: {
    username: '',
    password: ''
  }});

  async function loginHandler(data: z.infer<typeof loginSchema>) {

    try {
      console.log('data ', data)
      const res = await login(data)
        if(!res.success){
          toast.error(res.message)
          return 
        }
        router.replace('/admin/dashboard')
    } catch (error) {
      toast.error("Something went wrong. Please try again later.")
    }


  }


  
  return (
    <section className="h-full mt-[10%] flex items-center justify-center">
      <Card className="w-full max-w-sm py-4 max-sm:border-none">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(loginHandler)} >

          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl className="!mt-1">
                    <Input placeholder="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl className="!mt-1">
                    <Input placeholder="password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
          <Button className="w-full" type="submit" disabled={form.formState.isSubmitting} >
                
                { 
                form.formState.isSubmitting ? 
                <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sign in</>
                : 
                "Sign in"
                }
            </Button>
          </CardFooter>
          </form>

        </Form>
      </Card>
    </section>
  );
}
