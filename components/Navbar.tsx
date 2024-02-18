
import {Input} from '@/components/ui/input';
import { Search } from 'lucide-react';
import Cart from './Cart';

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center mb-4">

      <h1 className="text-3xl my-4 flex-1 ">Premium store</h1>

        <div className="flex w-full items-center flex-1" >
            <Input type="text" className="w-full border-2 pr-10" />
            <Search className="-ml-8 cursor-pointer" />
        </div>

        <div className="flex-1 shrink-0 text-end" >
        
            <Cart />

      </div>

    </nav>
  );
}
