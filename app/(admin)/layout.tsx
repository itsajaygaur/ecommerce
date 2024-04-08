import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function DashboardLayout({children}: Readonly<{children: React.ReactNode}>){
    return(
        <>
        <Header />
        <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="w-full pt-16">
          <ScrollArea className="h-full" >
          {children}
          </ScrollArea>
        </main>
      </div>
        </>
    )
}