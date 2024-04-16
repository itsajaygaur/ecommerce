import Header from "@/components/layout/Header"

export default function AdminLayout({children}: Readonly<{children: React.ReactNode}>){
    return(
        <>
        <Header />
        {children}
        </>
    )
}