"use client";
import {useSyncExternalStore} from "react";
import {getProductSnapshot,subscribeProductStore} from "../services/product-store";
export function useProducts(){return useSyncExternalStore(subscribeProductStore,getProductSnapshot,getProductSnapshot);}
