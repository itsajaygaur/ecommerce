// import ThemeToggle from "@/components/layout/ThemeToggle/theme-toggle";
import { cn } from "@/lib/utils";
import { MobileSidebar } from "./MobileSidebar";
// import { UserNav } from "./user-nav";
import Link from "next/link";
import ThemeToggle from "@/components/layout/Theme/ThemeToggle"
import { LogOut, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { logout } from "@/app/actions";
import { checkAuth } from "@/lib/auth";

export default async function Header() {

  const isLoggedIn = await checkAuth()

  return (
    <div className="sticky top-0 left-0 right-0 supports-backdrop-blur:bg-background/60 border-b bg-background/95 backdrop-blur z-20">
      <nav className="h-16 flex items-center justify-between px-4">
        <div className="hidden lg:block">
          <ShoppingBag size={24}  />
        </div>
        
        <div className={cn("block lg:!hidden")}>
        {
          isLoggedIn ?
            <MobileSidebar />
            :
            <ShoppingBag size={24}  />
          }
          </div>

        <div className="flex items-center gap-2">
          {/* <UserNav /> */}
          <ThemeToggle />

          {
            isLoggedIn &&
          <AlertDialog>
      <AlertDialogTrigger asChild>
        {/* <Button variant="outline">Show Dialog</Button> */}
        <Button size="icon" variant="ghost" >
            <LogOut size={20} />
          </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will log you out from dashbaord.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={logout}  >
            <Button variant="destructive" className="w-full" >
              Logout
            </Button> 
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

      }



          
        </div>
      </nav>
    </div>
  );
}
