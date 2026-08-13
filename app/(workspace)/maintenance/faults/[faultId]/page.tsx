import { FaultDetailsPage } from "@/features/maintenance/components/MaintenanceDetailsPages";
export default async function Page({params}:{params:Promise<{faultId:string}>}){return <FaultDetailsPage faultId={(await params).faultId}/>;}
