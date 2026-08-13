import { MaintenanceOrderDetailsPage } from "@/features/maintenance/components/MaintenanceDetailsPages";
export default async function Page({params}:{params:Promise<{orderId:string}>}){return <MaintenanceOrderDetailsPage orderId={(await params).orderId}/>;}
