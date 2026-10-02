import type { Rental, RentalDurationType, ServerTimeContract } from "../types";
export const MOCK_SERVER_TIME: ServerTimeContract = { source:"mock_server_authoritative",referenceIso:"2026-08-06T16:30:00+03:00",timezone:"Africa/Cairo" };
export const DEFAULT_RENTAL_PRICE_PER_QUARTER = 50;
export const DEFAULT_RENTAL_PRICE_PER_HOUR = DEFAULT_RENTAL_PRICE_PER_QUARTER * 4;
export const RENTAL_END_ALERT_SECONDS = 2 * 60;
export function isRentalEndingSoon(remainingSeconds:number){ return remainingSeconds >= 0 && remainingSeconds <= RENTAL_END_ALERT_SECONDS; }
const MOCK_SERVER_EPOCH = new Date(MOCK_SERVER_TIME.referenceIso).getTime();
const MOCK_RUNTIME_STARTED_AT = Date.now();
export const RENTAL_CLOCK_STORAGE_KEY = "l3bty-rental-clock-v1";
let browserClockAnchor: { referenceMs: number; browserMs: number } | null = null;
function getBrowserClockAnchor(){
  if(typeof window==="undefined")return null;
  if(browserClockAnchor)return browserClockAnchor;
  try{
    const stored=JSON.parse(window.localStorage.getItem(RENTAL_CLOCK_STORAGE_KEY)??"null") as {referenceMs?:number;browserMs?:number}|null;
    if(stored&&Number.isFinite(stored.referenceMs)&&Number.isFinite(stored.browserMs)){
      browserClockAnchor={referenceMs:stored.referenceMs!,browserMs:stored.browserMs!};
      return browserClockAnchor;
    }
    browserClockAnchor={referenceMs:MOCK_SERVER_EPOCH,browserMs:Date.now()};
    window.localStorage.setItem(RENTAL_CLOCK_STORAGE_KEY,JSON.stringify(browserClockAnchor));
    return browserClockAnchor;
  }catch{return{referenceMs:MOCK_SERVER_EPOCH,browserMs:MOCK_RUNTIME_STARTED_AT};}
}
export function currentMockServerMs(){ const anchor=getBrowserClockAnchor(); return anchor?anchor.referenceMs+Math.max(0,Date.now()-anchor.browserMs):MOCK_SERVER_EPOCH+Math.max(0,Date.now()-MOCK_RUNTIME_STARTED_AT); }
export function currentMockServerIso(){ return new Date(currentMockServerMs()).toISOString(); }
export function resetMockServerClock(){browserClockAnchor=null;if(typeof window!=="undefined"){try{window.localStorage.removeItem(RENTAL_CLOCK_STORAGE_KEY);}catch{/* Storage may be unavailable in tests. */}}}
export const durationMinutes: Record<Exclude<RentalDurationType,"custom"|"open_time">,number> = { fixed_15:15,fixed_30:30,fixed_45:45,fixed_60:60 };
export function addMinutes(iso:string,minutes:number){ return new Date(new Date(iso).getTime()+minutes*60_000).toISOString(); }
export function resolveDurationMinutes(type:RentalDurationType,custom:number){ if(type==="open_time") return null; if(type==="custom") return custom; return durationMinutes[type]; }
export function calculateFixedAmount(minutes:number,pricePerHour:number){ return Math.round((minutes/60)*pricePerHour*100)/100; }
export function calculateOpenSeconds(startedAt:string,referenceIso=MOCK_SERVER_TIME.referenceIso){ return Math.max(0,Math.floor((new Date(referenceIso).getTime()-new Date(startedAt).getTime())/1000)); }
export function calculateOpenAmount(seconds:number,pricePerHour:number){ return Math.round((seconds/3600)*pricePerHour*100)/100; }
export function calculateRentalLiveAmount(rental:Rental,referenceMs:number){
  if(!canExtendRental(rental))return rental.currentAmount;
  if(rental.durationType==="open_time"&&rental.startedAt){const seconds=Math.max(0,Math.floor((referenceMs-new Date(rental.startedAt).getTime())/1000));return calculateOpenAmount(seconds,rental.pricePerHour);}
  return rental.quotedAmount;
}
export function calculateRentalSettlement(totalAmount:number,paidAmount:number){const difference=Math.round((totalAmount-paidAmount)*100)/100;return{amountDue:Math.max(0,difference),customerChange:Math.max(0,-difference)};}
export function formatTimer(seconds:number){ const h=Math.floor(seconds/3600); const m=Math.floor((seconds%3600)/60); const s=seconds%60; return [h,m,s].map((v)=>String(v).padStart(2,"0")).join(":"); }
export function validateRentalStart(input:{customerId:string;assetAvailable:boolean;activeForAsset:boolean;hasOpenShift:boolean;price:number;durationMinutes:number|null}){ if(!input.customerId)return{valid:false,message:"العميل إلزامي.",rental:undefined}; if(!input.assetAvailable)return{valid:false,message:"الأصل غير متاح.",rental:undefined}; if(input.activeForAsset)return{valid:false,message:"يوجد تأجير نشط لنفس الأصل.",rental:undefined}; if(!input.hasOpenShift)return{valid:false,message:"يلزم وجود وردية مالية مفتوحة للتحصيل.",rental:undefined}; if(input.price<=0||input.durationMinutes===0)return{valid:false,message:"السعر أو المدة غير صالح.",rental:undefined}; return{valid:true,message:"",rental:undefined}; }
export function canExtendRental(rental:Rental){ return ["active","near_end","additional_time"].includes(rental.status); }
export function isRentalInCurrentShift(rental:Rental,openShiftIds:ReadonlySet<string>){
  return canExtendRental(rental)||(rental.collectionShiftId!==null&&openShiftIds.has(rental.collectionShiftId));
}
export function calculateOpenShiftRentalCollections(rentals:readonly Rental[],openShiftIds:ReadonlySet<string>){return Math.round(rentals.filter((rental)=>rental.collectionShiftId!==null&&openShiftIds.has(rental.collectionShiftId)).reduce((total,rental)=>total+Math.min(rental.paidAmount,rental.currentAmount),0)*100)/100;}
export function selectionElapsedBillableSeconds(){ return 0; }

