"use client";
import {useSyncExternalStore} from "react";
import {getProductSnapshot,subscribeProductStore} from "../services/product-store";
const EMPTY={products:[],stocks:[],movements:[]};
export function useProducts(){return useSyncExternalStore(subscribeProductStore,getProductSnapshot,()=>EMPTY);}
