import type { ProductBranchStock, ProductStockMovement, SaleProduct } from "./types";

const createdAt = "2026-07-01T10:00:00+03:00";
const updatedAt = "2026-08-06T09:00:00+03:00";

export const PRODUCT_FIXTURES: readonly SaleProduct[] = [
  { id:"product-car-12v",sku:"TOY-CAR-12V-RED",barcode:"622100000001",name:"سيارة أطفال كهربائية 12 فولت",type:"sale_toy",category:"سيارات أطفال كهربائية",brand:"L3BTY Kids",description:"سيارة أطفال كهربائية حمراء بجهاز تحكم.",salePrice:8900,costSnapshot:6900,taxRate:0,active:true,imageMockKey:"electric-kids-car",warrantyDays:180,createdAt,updatedAt },
  { id:"product-drift-blue",sku:"TOY-DRIFT-BLU",barcode:"622100000002",name:"سيارة دريفت كهربائية زرقاء",type:"sale_toy",category:"سيارات دريفت",brand:"L3BTY Ride",description:"سيارة دريفت كهربائية للأطفال ببطارية قابلة للشحن.",salePrice:12500,costSnapshot:9700,taxRate:0,active:true,imageMockKey:"drift-car",warrantyDays:180,createdAt,updatedAt },
  { id:"product-bike-red",sku:"TOY-BIKE-RED",barcode:"622100000003",name:"موتوسيكل أطفال كهربائي أحمر",type:"sale_toy",category:"موتوسيكلات أطفال",brand:"Mini Rider",description:"موتوسيكل كهربائي مناسب للأطفال.",salePrice:6750,costSnapshot:5100,taxRate:0,active:true,imageMockKey:"electric-bike",warrantyDays:120,createdAt,updatedAt },
  { id:"product-hoverboard",sku:"TOY-HOVER-65",barcode:"622100000004",name:"هوفر بورد 6.5 بوصة",type:"sale_toy",category:"هوفر بورد",brand:"Move Kids",description:"هوفر بورد كهربائي بإضاءة جانبية.",salePrice:7200,costSnapshot:5600,taxRate:0,active:false,imageMockKey:"hoverboard",warrantyDays:90,createdAt,updatedAt },
  { id:"part-battery-12v",sku:"PART-BAT-12V",barcode:"622200000001",name:"بطارية ألعاب كهربائية 12 فولت",type:"spare_part",category:"بطاريات",brand:"Power Kids",description:"بطارية بديلة للألعاب الكهربائية المتوافقة.",salePrice:1450,costSnapshot:1050,taxRate:0,active:true,imageMockKey:"battery-12v",warrantyDays:90,createdAt,updatedAt },
  { id:"part-charger-12v",sku:"PART-CHG-12V",barcode:"622200000002",name:"شاحن ألعاب كهربائية 12 فولت",type:"spare_part",category:"شواحن",brand:"Power Kids",description:"شاحن بديل مزود بمؤشر حالة.",salePrice:480,costSnapshot:310,taxRate:0,active:true,imageMockKey:"charger-12v",warrantyDays:30,createdAt,updatedAt },
  { id:"part-controller",sku:"PART-CTRL-24G",barcode:"622200000003",name:"كنترول ريموت 2.4G",type:"spare_part",category:"كنترول",brand:"Ride Control",description:"وحدة كنترول وريموت للألعاب المتوافقة.",salePrice:850,costSnapshot:590,taxRate:0,active:true,imageMockKey:"remote-control",warrantyDays:30,createdAt,updatedAt },
  { id:"part-motor-550",sku:"PART-MTR-550",barcode:"622200000004",name:"موتور ألعاب كهربائية 550",type:"spare_part",category:"مواتير",brand:"Ride Motor",description:"موتور بديل للألعاب الكهربائية.",salePrice:980,costSnapshot:710,taxRate:0,active:true,imageMockKey:"motor-550",warrantyDays:45,createdAt,updatedAt },
  { id:"part-wheel",sku:"PART-WHL-EVA",barcode:"622200000005",name:"عجلة EVA لسيارة أطفال",type:"spare_part",category:"عجلات",brand:"Ride Parts",description:"عجلة بديلة مناسبة لسيارات الأطفال.",salePrice:620,costSnapshot:420,taxRate:0,active:true,imageMockKey:"eva-wheel",warrantyDays:0,createdAt,updatedAt },
];

const stock = (productId:string,branchId:string,quantityAvailable:number,minimumStock:number,averageCost:number):ProductBranchStock => ({productId,branchId,quantityAvailable,quantityReserved:0,minimumStock,averageCost,lastMovementAt:updatedAt});
export const PRODUCT_STOCK_FIXTURES: readonly ProductBranchStock[] = [
  stock("product-car-12v","main",6,2,6900),stock("product-car-12v","branch-2",3,2,6920),stock("product-car-12v","branch-3",0,2,6950),
  stock("product-drift-blue","main",2,2,9700),stock("product-drift-blue","branch-2",1,2,9750),stock("product-drift-blue","branch-3",2,1,9780),
  stock("product-bike-red","main",4,2,5100),stock("product-bike-red","branch-2",2,2,5150),stock("product-bike-red","branch-3",1,1,5180),
  stock("product-hoverboard","main",2,1,5600),stock("product-hoverboard","branch-2",0,1,5650),stock("product-hoverboard","branch-3",1,1,5650),
  stock("part-battery-12v","main",10,4,1050),stock("part-battery-12v","branch-2",3,4,1070),stock("part-battery-12v","branch-3",2,3,1080),
  stock("part-charger-12v","main",14,5,310),stock("part-charger-12v","branch-2",6,4,315),stock("part-charger-12v","branch-3",3,4,320),
  stock("part-controller","main",5,3,590),stock("part-controller","branch-2",2,3,600),stock("part-controller","branch-3",2,2,605),
  stock("part-motor-550","main",3,3,710),stock("part-motor-550","branch-2",1,2,720),stock("part-motor-550","branch-3",0,2,725),
  stock("part-wheel","main",8,4,420),stock("part-wheel","branch-2",4,3,430),stock("part-wheel","branch-3",2,3,435),
  stock("part-battery-12v","workshop",7,4,1060),stock("part-charger-12v","workshop",9,5,318),stock("part-controller","workshop",4,3,598),stock("part-motor-550","workshop",2,2,718),stock("part-wheel","workshop",3,3,428),
];

export const PRODUCT_MOVEMENT_FIXTURES: readonly ProductStockMovement[] = PRODUCT_STOCK_FIXTURES.slice(0,8).map((item,index)=>({id:`movement-opening-${index+1}`,productId:item.productId,branchId:item.branchId,type:"opening",quantity:item.quantityAvailable,reference:"OPENING-MOCK",reason:"رصيد افتتاحي تجريبي",at:createdAt}));
