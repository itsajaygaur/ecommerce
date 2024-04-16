import { Icons } from "@/components/Icons";

type Rating = {
    rate: number;
    count: number;
}

export type Product = {
    id: number;
    title: string;
    price: number;
    description: string;
    category: string;
    image: string;
    rating?: Rating;
    quantity?: number
}

export type NavItem = {
    title: string;
    href?: string;
    disabled?: boolean;
    external?: boolean;
    icon?: keyof typeof Icons;
    label?: string;
    description?: string;
  }