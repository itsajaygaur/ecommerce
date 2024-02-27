import Link from 'next/link';
import {Input} from '@/components/ui/input';
import { Search } from 'lucide-react';
import Cart from './Cart';

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center mb-4 max-w-[95%] mx-auto">

      <Link href="/" className='inline-block my-4 flex-1' >
        <h1 className="text-3xl ">Premium store</h1>
      </Link>

        <div className="flex w-full items-center flex-1" >
            <Input type="text" placeholder='Search products' className="w-full border-2 pr-10 rounded-none" />
            <Search className="-ml-8 cursor-pointer" />
        </div>

        <div className="flex-1 shrink-0 text-end" >
        
            <Cart />

      </div>

    </nav>
  );
}
