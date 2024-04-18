import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "./lib/auth";

export async function middleware(request: NextRequest){
    const token = await request.cookies.get('session')?.value

    const verifyToken = token && await verifySession(token).catch(err => console.log(err))



    if(!verifyToken && request.nextUrl.pathname.startsWith('/admin/login') ){
        return
    }

    if(verifyToken && request.nextUrl.pathname.startsWith('/admin/login') ){
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }

    if(!verifyToken){
        return NextResponse.redirect(new URL('/admin/login', request.url))
    }

}

export const config = {
    matcher: '/admin/:path*',
  }