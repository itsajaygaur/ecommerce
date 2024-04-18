import Link from 'next/link';
import {Input} from '@/components/ui/input';
import { Search } from 'lucide-react';
import Cart from './Cart';
import { search } from '@/app/actions';
import ThemeToggle from './layout/Theme/ThemeToggle';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';



export default async function Navbar() {


  return (
    <nav className=" flex gap-3 justify-between items-center px-[2.5%] mx-auto mb-4 h-16">
      <div className='flex-1' >
        <Link href="/" className='inline-block' >
          {/* <h1 className="text-3xl font-sans ">MyKart</h1> */}
          <ShoppingBag size={28}  />
          {/* <Image src="/mykart-logo.jpg" width={50} height={50} alt="mykart logo" /> */}
        </Link>
      </div>

        <form action={search} className="flex items-center flex-auto max-w-md" >
            <Input type="text" name='query' placeholder='Search products' className=" border-2 pr-10 rounded-none" />
            <button type='submit' className='-ml-8 z-10' >
             <Search />
            </button>
        </form>

        <div className="flex-1 shrink-0 text-end flex items-center gap-3 justify-end" >
            <ThemeToggle noRound={true} />
            <Cart />

      </div>

    </nav>
  );
}
