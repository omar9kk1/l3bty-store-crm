"use client";

import { LocateFixed, MapPinOff, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Branch } from "@/features/branches/types";
import { haversineDistanceMeters, resolveLocationStatus } from "../services/attendance-rules";
import { locationLabels } from "./attendance-labels";
import type { LocationStatus } from "../types";

export interface LocationReading {
  state: "requesting" | "ready" | "denied" | "unavailable";
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  distanceMeters?: number;
  status: LocationStatus;
}

export function AttendanceLocationStatus({ branch, onChange }: { branch: Branch; onChange: (reading: LocationReading) => void }) {
  const [reading, setReading] = useState<LocationReading>({ state: "requesting", status: "unavailable" });
  const locate = useCallback(() => {
    const requesting: LocationReading = { state: "requesting", status: "unavailable" };
    setReading(requesting);
    onChange(requesting);
    if (!navigator.geolocation) {
      const next: LocationReading = { state: "unavailable", status: "unavailable" };
      setReading(next); onChange(next); return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const distanceMeters = haversineDistanceMeters(position.coords.latitude, position.coords.longitude, branch.latitude, branch.longitude);
      const next: LocationReading = { state: "ready", latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: Math.round(position.coords.accuracy), distanceMeters, status: resolveLocationStatus(distanceMeters, branch.geofenceRadiusMeters, position.coords.accuracy) };
      setReading(next); onChange(next);
    }, (error) => {
      const next: LocationReading = { state: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable", status: "unavailable" };
      setReading(next); onChange(next);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }, [branch, onChange]);

  useEffect(() => {
    const timer = window.setTimeout(locate, 0);
    return () => window.clearTimeout(timer);
  }, [locate]);

  return <section className="attendance-location" data-location-state={reading.state}><header><div>{reading.state === "ready" ? <LocateFixed aria-hidden size={20} /> : <MapPinOff aria-hidden size={20} />}<strong>حالة الموقع</strong></div><span>{reading.state === "ready" ? locationLabels[reading.status] : reading.state === "requesting" ? "جار التحديد" : "غير متاح"}</span></header>{reading.state === "ready" ? <dl><div><dt>المسافة من الفرع</dt><dd>{reading.distanceMeters?.toLocaleString("ar-EG-u-nu-latn")} متر</dd></div><div><dt>دقة الموقع</dt><dd>{reading.accuracyMeters?.toLocaleString("ar-EG-u-nu-latn")} متر</dd></div><div><dt>النطاق المسموح</dt><dd>{branch.geofenceRadiusMeters.toLocaleString("ar-EG-u-nu-latn")} متر</dd></div></dl> : <div className="attendance-location__error"><p>{reading.state === "denied" ? "تم رفض إذن الموقع. لا يمكن التسجيل الناجح." : "تعذر تحديد الموقع بالدقة المطلوبة."}</p><Button icon={<RefreshCw aria-hidden size={16} />} onClick={locate}>إعادة المحاولة</Button></div>}</section>;
}
