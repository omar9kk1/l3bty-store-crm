import { PRODUCT_FIXTURES, PRODUCT_MOVEMENT_FIXTURES, PRODUCT_STOCK_FIXTURES } from "../fixtures";
import type { ProductBranchStock, ProductFormValues, ProductStockMovement, SaleProduct } from "../types";
import { validateProduct } from "../schemas/product-schema";

const at = "2026-08-06T16:30:00+03:00";
let products: readonly SaleProduct[] = PRODUCT_FIXTURES.map((item)=>({...item}));
let stocks: readonly ProductBranchStock[] = PRODUCT_STOCK_FIXTURES.map((item)=>({...item}));
let movements: readonly ProductStockMovement[] = PRODUCT_MOVEMENT_FIXTURES.map((item)=>({...item}));
let sequence = 100;
let snapshot = {products,stocks,movements};
const listeners = new Set<()=>void>();
function emit(){snapshot={products,stocks,movements};listeners.forEach((listener)=>listener());}
export function subscribeProductStore(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener);}
export function getProductSnapshot(){return snapshot;}

export function saveProduct(values:ProductFormValues,currentId?:string){
  const validation=validateProduct(values,products,currentId);if(!validation.valid)return{valid:false,message:Object.values(validation.errors)[0],errors:validation.errors};
  const id=currentId??`product-mock-${sequence++}`;
  const existing=products.find((product)=>product.id===id);
  const product:SaleProduct={id,sku:values.sku.trim(),barcode:values.barcode.trim(),name:values.name.trim(),type:values.type,category:values.category.trim(),brand:values.brand.trim(),description:values.description.trim(),salePrice:values.salePrice,costSnapshot:values.costSnapshot,taxRate:values.taxRate,active:values.active,imageMockKey:values.imageMockKey.trim(),warrantyDays:values.warrantyDays,createdAt:existing?.createdAt??at,updatedAt:at};
  products=existing?products.map((item)=>item.id===id?product:item):[product,...products];
  if(!existing){for(const[branchId,quantity]of Object.entries(values.openingStock)){stocks=[...stocks,{productId:id,branchId,quantityAvailable:quantity,quantityReserved:0,minimumStock:values.minimumStock,averageCost:values.costSnapshot,lastMovementAt:at}];movements=[{id:`movement-${sequence++}`,productId:id,branchId,type:"opening",quantity,reference:"PRODUCT-CREATE",reason:"رصيد افتتاحي Mock",at},...movements];}}
  emit();return{valid:true,message:existing?"تم تحديث المنتج في Mock State.":"تمت إضافة المنتج إلى Mock State.",product};
}

export function commitSaleStock(lines:readonly{productId:string;quantity:number}[],branchId:string,reference:string){
  if(lines.some((line)=>{const stock=stocks.find((item)=>item.productId===line.productId&&item.branchId===branchId);return !stock||stock.quantityAvailable-stock.quantityReserved<line.quantity;}))return{valid:false,message:"الرصيد غير كافٍ لإتمام البيع."};
  stocks=stocks.map((stock)=>{const line=lines.find((item)=>item.productId===stock.productId);return stock.branchId===branchId&&line?{...stock,quantityAvailable:stock.quantityAvailable-line.quantity,lastMovementAt:at}:stock;});
  movements=[...lines.map((line,index)=>({id:`movement-sale-${sequence++}-${index}`,productId:line.productId,branchId,type:"sale" as const,quantity:-line.quantity,reference,reason:"بيع Mock",at})),...movements];emit();return{valid:true,message:"تم خفض الرصيد."};
}

export function commitReturnStock(productId:string,branchId:string,quantity:number,reference:string,resellable:boolean){
  if(resellable)stocks=stocks.map((stock)=>stock.productId===productId&&stock.branchId===branchId?{...stock,quantityAvailable:stock.quantityAvailable+quantity,lastMovementAt:at}:stock);
  movements=[{id:`movement-return-${sequence++}`,productId,branchId,type:resellable?"sale_return":"damaged_return",quantity:resellable?quantity:0,reference,reason:resellable?"مرتجع صالح للبيع":"مرتجع إلى الفحص",at},...movements];emit();
}

export function commitMaintenancePartStock(productId:string,branchId:string,quantity:number,reference:string){
  const product=products.find((item)=>item.id===productId);const stock=stocks.find((item)=>item.productId===productId&&item.branchId===branchId);
  if(!product||product.type!=="spare_part")return{valid:false,message:"لا يسمح إلا بصرف قطعة غيار داخل أمر الصيانة."};
  if(quantity<=0)return{valid:false,message:"كمية الصرف يجب أن تكون أكبر من صفر."};
  if(!stock||stock.quantityAvailable-stock.quantityReserved<quantity)return{valid:false,message:"رصيد قطعة الغيار غير كافٍ."};
  stocks=stocks.map((item)=>item.productId===productId&&item.branchId===branchId?{...item,quantityAvailable:item.quantityAvailable-quantity,lastMovementAt:at}:item);
  movements=[{id:`movement-maintenance-${sequence++}`,productId,branchId,type:"maintenance_issue",quantity:-quantity,reference,reason:"صرف مرتبط بأمر صيانة Mock",at},...movements];emit();return{valid:true,message:"تم صرف قطعة الغيار وربط الحركة بأمر الصيانة."};
}

export function applyProductStockMovement(input:{productId:string;branchId:string;quantity:number;type:ProductStockMovement["type"];reference:string;reason:string;performedByEmployeeId:string;idempotencyKey:string;unitCost?:number;newAverageCost?:number}){
  const duplicate=movements.find((item)=>item.idempotencyKey===input.idempotencyKey);if(duplicate)return{valid:true,message:"تم تطبيق الحركة سابقًا.",duplicate:true,movement:duplicate};
  const stock=stocks.find((item)=>item.productId===input.productId&&item.branchId===input.branchId);if(!stock)return{valid:false,message:"لا يوجد رصيد لهذا المنتج في الموقع المحدد."};
  if(input.quantity===0)return{valid:false,message:"كمية الحركة لا يمكن أن تساوي صفرًا."};
  if(stock.quantityAvailable-stock.quantityReserved+input.quantity<0)return{valid:false,message:"الرصيد المتاح لا يكفي لتنفيذ الحركة."};
  stocks=stocks.map((item)=>item===stock?{...item,quantityAvailable:item.quantityAvailable+input.quantity,averageCost:input.newAverageCost??item.averageCost,lastMovementAt:at}:item);
  const movement:ProductStockMovement={id:`movement-inventory-${sequence++}`,productId:input.productId,branchId:input.branchId,type:input.type,quantity:input.quantity,reference:input.reference,reason:input.reason,at,unitCost:input.unitCost,performedByEmployeeId:input.performedByEmployeeId,idempotencyKey:input.idempotencyKey};movements=[movement,...movements];emit();return{valid:true,message:"تم تسجيل حركة المخزون.",duplicate:false,movement};
}

export function resetProductStore(){products=PRODUCT_FIXTURES.map((item)=>({...item}));stocks=PRODUCT_STOCK_FIXTURES.map((item)=>({...item}));movements=PRODUCT_MOVEMENT_FIXTURES.map((item)=>({...item}));sequence=100;emit();}
