import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
// import { Toaster } from "@/components/ui/sonner";
import { Toaster } from "sonner";
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from "@/components/layout/Theme/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MyKart",
  description: "A comprehensive ecommerce platform built in Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className}`}>
        {/* <Navbar /> */}
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >

        <NextTopLoader showSpinner={false} color="#adfa1d" height={2} />
        {children}
        <Toaster richColors />
          </ThemeProvider>
      </body>
    </html>
  );
}
