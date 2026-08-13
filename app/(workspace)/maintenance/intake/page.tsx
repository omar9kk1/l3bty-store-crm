import { MaintenanceIntakePage } from "@/features/maintenance/components/MaintenanceIntakePage";
import type { MaintenanceSubjectType } from "@/features/maintenance/types";

export default async function Page({searchParams}:{searchParams:Promise<{type?:string}>}){
  const params=await searchParams;
  const initialSubjectType:MaintenanceSubjectType=params.type==="customer_item"?"customer_item":"internal_asset";
  return <MaintenanceIntakePage initialSubjectType={initialSubjectType}/>;
}
