import type {RentalDurationType,RentalStatus} from "../types";
export const rentalStatusLabels:Record<RentalStatus,string>={selecting:"اختيار وتجربة",active:"نشط",near_end:"اقترب الانتهاء",additional_time:"بانتظار قرار",completed:"منتهي",cancelled:"ملغى"};
export const durationLabels:Record<RentalDurationType,string>={fixed_15:"15 دقيقة",fixed_30:"30 دقيقة",fixed_45:"45 دقيقة",fixed_60:"60 دقيقة",custom:"مدة مخصصة",open_time:"Open Time"};
export const money=(value:number)=>`${value.toLocaleString("ar-EG-u-nu-latn",{minimumFractionDigits:0,maximumFractionDigits:2})} ج.م`;
export const time=(iso:string|null)=>iso?new Intl.DateTimeFormat("ar-EG-u-nu-latn",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Cairo"}).format(new Date(iso)):"—";
export const statusTone=(status:RentalStatus):"success"|"warning"|"danger"|"info"|"neutral"=>status==="active"?"success":status==="near_end"||status==="additional_time"?"warning":status==="cancelled"?"danger":status==="completed"?"neutral":"info";
