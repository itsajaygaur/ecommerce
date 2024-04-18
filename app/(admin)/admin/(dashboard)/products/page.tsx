import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import AllProducts from "../_components/DbProducts";

export default function ProductPage() {
  return (
    <div className="mt-6">
      <div className="flex justify-between items-center gap-4 mb-6">
        <h2 className="text-3xl font-semibold">Products</h2>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="mr-2" size={16} /> Add new
          </Button>
        </Link>
      </div>
      <AllProducts />
    </div>
  );
}
