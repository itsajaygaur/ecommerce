import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"

export default function DashboardLayout({children}: Readonly<{children: React.ReactNode}>){
    return(
        <>
        <Header />
        <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="w-full pt-16">{children}</main>
      </div>
        </>
    )
}