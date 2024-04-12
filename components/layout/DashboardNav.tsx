"use client"
import { cn } from "@/lib/utils";
import { Icons } from "@/components/Icons";
import Link from "next/link";
import { NavItem } from "@/lib/types";
import { Dispatch, SetStateAction } from "react";
import { usePathname } from "next/navigation";


type DashboardNavProps = {
      items: NavItem[];
      setOpen?: Dispatch<SetStateAction<boolean>>;
    }
      
export default function DashboardNav({items, setOpen }: DashboardNavProps){

    const path = usePathname()

    return(
        <nav className="grid items-start gap-2">
        {items.map((item, index) => {
            const Icon = Icons[item.icon || "arrowRight"];
            return (
            item.href && (
                <Link
                key={index}
                href={item.disabled ? "/" : item.href}
                onClick={() => {
                    if (setOpen) setOpen(false);
                }}
                >
                <span
                    className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    path.startsWith(item.href) ? "bg-accent" : "transparent",
                    item.disabled && "cursor-not-allowed opacity-80",
                    )}
                >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                </span>
                </Link>
            )
            );
        })}
        </nav>
    )
}