"use client"
import { cn } from "@/lib/utils";
import DashboardNav from "./DashboardNav";
import { navItems } from "@/constants/data";

export default function Sidebar(){


    return(
        <nav
        className={cn(`relative hidden h-screen lg:block w-72 pt-20`)}
      >
        <div className="space-y-4 py-4 fixed w-56 border-r h-full ">
          <div className="px-3 py-2">
            <div className="space-y-1">
              <h2 className="mb-2 px-4 text-xl font-semibold tracking-tight">
                Overview
              </h2>
                <DashboardNav items={navItems} />
            </div>
          </div>
        </div>
      </nav>
    )
}