import {SaleInvoicePage} from "@/features/sales/components/SaleInvoicePage";
import {SaleCancelAction} from "@/features/sales/components/SaleCancelAction";
export default async function Page({params}:{params:Promise<{invoiceId:string}>}){const{invoiceId}=await params;return<><SaleInvoicePage invoiceId={invoiceId}/><SaleCancelAction invoiceId={invoiceId}/></>;}
