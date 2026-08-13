import {ProductDetailsPage} from "@/features/products/components/ProductDetailsPage";
export default async function Page({params}:{params:Promise<{productId:string}>}){const{productId}=await params;return<ProductDetailsPage productId={productId}/>;}
