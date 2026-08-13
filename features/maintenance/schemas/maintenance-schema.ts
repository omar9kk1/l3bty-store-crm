import type { MaintenanceIntakeInput } from "../types";

export function validateMaintenanceIntake(input:MaintenanceIntakeInput){
  const errors:Record<string,string>={};
  if(!input.branchId)errors.branchId="الفرع إلزامي.";
  if(input.subjectType==="internal_asset"&&!input.rentalAssetId)errors.rentalAssetId="أصل التأجير إلزامي.";
  if(input.subjectType==="customer_item"&&!input.customerId)errors.customerId="العميل إلزامي.";
  if(input.subjectType==="customer_item"&&!input.itemName.trim())errors.itemName="اسم أو وصف اللعبة إلزامي.";
  if(!input.faultDescription.trim())errors.faultDescription="وصف العطل إلزامي.";
  if(!input.intakeCondition.trim())errors.intakeCondition="حالة اللعبة عند الاستلام إلزامية.";
  return{valid:Object.keys(errors).length===0,errors};
}
