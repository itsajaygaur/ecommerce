import AddProductForm from "./AddProductForm"
import AllProducts from "./DbProducts"


export default function Dashboard(){

    
    return(
        <section className="container max-w-2xl mt-20" >

            <AddProductForm />

            <AllProducts />

        </section>
    )
}