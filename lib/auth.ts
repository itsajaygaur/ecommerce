"use server"
import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"


const key = new TextEncoder().encode(process.env.JWT_SECRET)


export async function encrypt(payload: {username: string,  expires: Date}){
    return new SignJWT(payload)
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime("24 hrs")
    .sign(key)
}

async function decrypt(token: string){
    const {payload} = await jwtVerify(token, key, {algorithms: ['HS256']})
    return payload
}

export async function verifySession(token: string){
    if(!token) return null
    return await decrypt(token)
}

export async function checkAuth(){
    const token = cookies().get('session')?.value
    if(!token) return false
    const result =  await verifySession(token).catch(err => console.log(err))
    if(!result) return false
    return true
}