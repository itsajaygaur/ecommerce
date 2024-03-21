import Link from 'next/link';
import {Input} from '@/components/ui/input';
import { Search } from 'lucide-react';
import Cart from './Cart';
import { search } from '@/app/actions';


export default async function Navbar() {


  return (
    <nav className=" flex justify-between items-center max-w-[95%] mx-auto mb-1">
      <div className='flex-1' >
        <Link href="/" className='my-4 inline-block ' >
          <h1 className="text-3xl ">Premium store</h1>
        </Link>
      </div>

        <form action={search} className="flex w-full items-center flex-1" >
            <Input type="text" name='query' placeholder='Search products' className="w-full border-2 pr-10 rounded-none" />
            <button type='submit' className='-ml-8 z-10' >
             <Search />
            </button>
        </form>

        <div className="flex-1 shrink-0 text-end" >
        
            <Cart />

      </div>

    </nav>
  );
}
