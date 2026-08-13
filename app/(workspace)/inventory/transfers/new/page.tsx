import{CreateTransferPage}from"@/features/transfers/components/CreateTransferPage";

export default async function Page({searchParams}:{searchParams:Promise<{type?:string;orderId?:string}>}){
  const params=await searchParams;
  return <CreateTransferPage initialType={params.type} initialOrderId={params.orderId}/>;
}
