import {create} from "zustand";
import { Product } from "@/app/type";


type CartState = {
    items: Product[]
    addItem: (product: Product) => void
    removeItem: (productId: Number) => void
    clearCart: () => void
}

type CartSlideState = {
    isOpened: boolean,
    open: (shouldOpen: boolean) => void
}

export const useCart =  create<CartState>()((set) => ({
    items: [],
    addItem: product => set(state => ({items: [...state.items, product]})),
    removeItem: id => set(state => ({items: state.items.filter(item => item.id !== id)}) ),
    clearCart: () => set(state => ({items: []}))
}))


export const useCartSlide = create<CartSlideState>(set => ({
    isOpened : false,
    open: shouldOpen => set(() => ({isOpened: shouldOpen}))
}))
