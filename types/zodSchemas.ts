import { z } from "zod"

export const productSchema = z.object({
    id: z.number().positive().optional(),
    title: z.string().trim().min(1, {message: 'This field is required'}),
    description: z.string().trim().min(1, {message: 'This field is required'}),
    price: z.string().trim().min(1, {message: 'This field is required'}),
    // price: z.number({ required_error: 'This field is required' }).positive(),
    // price: z.string().transform((v) => Number(v)||0),
    category: z.string().trim().min(1, {message: 'This field is required'}),
    image: z.any()
    .refine((file) => file?.length == 1, 'File is required.')
    .refine((file) => file[0]?.size <= 6000000, `Max file size is 6MB.`),
})


export const updateProductSchema = z.object({
    id: z.number().positive().optional(),
    title: z.string().trim().min(1, {message: 'This field is required'}),
    description: z.string().trim().min(1, {message: 'This field is required'}),
    price: z.string().trim().min(1, {message: 'This field is required'}),
    // price: z.number({ required_error: 'This field is required' }).positive(),
    // price: z.string().transform((v) => Number(v)||0),
    category: z.string().trim().min(1, {message: 'This field is required'}),
    image: z.any()
    // .refine((file) => file?.length == 1, 'File is required.')
    .refine((file) => file.length ? file[0]?.size <= 6000000 : true, `Max file size is 6MB.`),
})

export const loginSchema = z.object({
    username: z.string().trim().min(1, {message: 'Enter username'}),
    password: z.string().trim().min(1, {message: 'Enter password'})
})