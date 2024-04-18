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

export default async function AllProducts(){
    const result = await getProducts()

    // console.log('data --> ', result)
    if(!result.success) return <p>{result.message}</p>

    return <div className="border rounded-md" >

<Table  >
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
            result.data && result.data.map(product => (
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


    </div>
}