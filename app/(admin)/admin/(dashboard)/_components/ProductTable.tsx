import { getProducts } from "@/app/actions";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"

import CellAction from "./CellAction";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Product } from "@/types";

export default function ProductTable({products, totalProductCount, currentPage = '1'}: {products: Product[], totalProductCount?: number, currentPage: string}){

  const pages = Array.from({length : (Math.ceil(totalProductCount! / 10)) || 0}, (_, i) => i + 1)

    return <div  >

<Table className="border rounded-md"  >
      {/* <TableCaption>A list of all your products</TableCaption> */}
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Id</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Price</TableHead>
          <TableHead className="">Category</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody >

        
      {
            products && products.map(product => (
                <TableRow key={product.id} className="" >
                <TableCell className="font-medium ">{product.id}</TableCell>
                <TableCell className="" >{product.title}</TableCell>
                <TableCell className="" >{product.price}</TableCell>
                <TableCell className="">{product.category}</TableCell>
                <TableCell className="text-right ">

                <CellAction product={product} />


                </TableCell>
              </TableRow>
            ))
        }


      </TableBody>
      {/* <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right">$2,500.00</TableCell>
        </TableRow>
      </TableFooter> */}
    </Table>
      {
        pages.length > 1 &&
        <div className="mt-8" >

    <Pagination>
      <PaginationContent>

        {
          pages
            .map(i => (
              <PaginationItem key={i} value={i}>
                <PaginationLink href={`/admin/products/?page=${i}`} isActive={JSON.stringify(i) === currentPage} >{i}</PaginationLink>
              </PaginationItem>
            ))
        }
      </PaginationContent>
    </Pagination>
      </div>
          }



    </div>
}