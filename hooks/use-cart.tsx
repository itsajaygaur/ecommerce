import {create} from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware'

// import { Product } from "@/app/type";
import { Product } from "@/types";


type CartState = {
    items: Product[]
    addItem: (product: Product) => void
    removeItem: (productId: Number) => void
    clearCart: () => void,
    quantity: (id:  number, operation: 'INCREASE' | 'DECREASE') => void
}

type CartSlideState = {
    isOpened: boolean,
    open: (shouldOpen: boolean) => void
}

export const useCart =  create<CartState>()(persist( (set) => ({
    items: [],
    // addItem: product => set(state => ({items: [...state.items, product] })),
    addItem: product => set(state => {
            const existingProductIndex = state.items.findIndex(p => p.id === product.id);
            if(existingProductIndex !== -1){
                const updatedItems = state.items.map((item, index) => {
                    if(index === existingProductIndex){
                        return {...item, quantity: (item.quantity || 0) + 1}
                    }
                    return item
                }  )
                return {items: updatedItems}
        }
        return {items: [...state.items, {...product, quantity: 1} ] }
        
    }),
    removeItem: id => set(state => ({items: state.items.filter(item => item.id !== id)}) ),
    clearCart: () => set(state => ({items: []})),
    quantity: (id, operation) => set(state => {
        // return {items: state.items.map(item => item.id === id ? {...item, quantity: operation.operation === 'INCREASE' ? item?.quantity + 1 : item?.quantity - 1} : item)}

        const updatedItems = state.items.map(item => {
            if(item.id === id && item.quantity){
                return {...item, quantity: operation === 'INCREASE' ? item?.quantity + 1 : item?.quantity - 1}
            }
            return item
            }
        )

        return {items: updatedItems}
    })
}), {name: 'cart'}))


export const useCartSlide = create<CartSlideState>(set => ({
    isOpened : false,
    open: shouldOpen => set(() => ({isOpened: shouldOpen}))
}))
