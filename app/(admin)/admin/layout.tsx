import Header from "@/components/layout/Header"

export default function AdminLayout({children}: Readonly<{children: React.ReactNode}>){
    return(
        <div className="flex flex-col min-h-screen relative" >
        <Header />
        {children}
        </div>
    )
}