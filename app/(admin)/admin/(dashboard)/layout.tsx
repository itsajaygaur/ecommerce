import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function DashboardLayout({children}: Readonly<{children: React.ReactNode}>){
    return(
        <>
        {/* <Header /> */}
        <div className="flex-1 flex -mt-20">
        <Sidebar />
        <main className="w-full">
          {/* <ScrollArea className="h-full !overflow-x-auto" > */}
            <div className="px-4 md:px-8 pb-6 pt-20" >
            {children}
            </div>
          {/* </ScrollArea> */}
        </main>
      </div>
        </>
    )
}