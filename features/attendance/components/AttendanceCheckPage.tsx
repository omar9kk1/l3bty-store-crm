"use client";

import Link from "next/link";
import { Camera, CheckCircle2, Clock3, MapPin, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBranches } from "@/features/branches/hooks/use-branches";
import { resolvePreviewEmployee } from "@/features/employees/fixtures";
import { useEmployees } from "@/features/employees/hooks/use-employees";
import { PERMISSION_KEYS } from "@/permissions/keys";
import { ROLE_TEMPLATES } from "@/permissions/role-templates";
import { useAttendance } from "../hooks/use-attendance";
import { captureAttendance } from "../services/attendance-store";
import { nextAttendanceAction, validateAttendanceSequence } from "../services/attendance-rules";
import type { AttendanceViewState } from "../types";
import { AttendanceCameraCapture, type CameraState } from "./AttendanceCameraCapture";
import { AttendanceLocationStatus, type LocationReading } from "./AttendanceLocationStatus";
import { AttendanceSkeleton } from "./AttendanceSkeleton";
import { formatEgyptTime } from "./attendance-labels";

export function AttendanceCheckPage() {
  const { permissions } = useShell();
  if (!permissions.has(PERMISSION_KEYS.attendanceCapture)) return <PermissionDeniedState />;
  return <CheckContent />;
}

function CheckContent() {
  const params = useSearchParams();
  const { roles } = useShell();
  const employees = useEmployees();
  const branches = useBranches();
  const data = useAttendance();
  const employee = resolvePreviewEmployee(roles, employees);
  const allowedBranches = branches.filter((branch) => employee.assignedBranchIds.includes(branch.id));
  const [branchId, setBranchId] = useState(employee.primaryBranchId);
  const branch = allowedBranches.find((item) => item.id === branchId) ?? allowedBranches[0];
  const [cameraState, setCameraState] = useState<CameraState>("requesting");
  const [location, setLocation] = useState<LocationReading>({ state: "requesting", status: "unavailable" });
  const [captureRequest, setCaptureRequest] = useState(0);
  const [notice, setNotice] = useState("");
  const [clock, setClock] = useState(() => new Date());
  const state = (params.get("state") ?? "normal") as AttendanceViewState;
  const offline = state === "offline";
  const employeeEvents = (state === "empty" ? [] : data.events).filter((item) => item.employeeId === employee.id);
  const action = nextAttendanceAction(employeeEvents);
  const lastEvent = [...employeeEvents].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
  const locationChange = useCallback((value: LocationReading) => setLocation(value), []);
  const ready = !offline && cameraState === "ready" && location.state === "ready" && (location.status === "inside" || location.status === "outside");

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function submit() {
    if (!branch || !ready || location.latitude === undefined || location.longitude === undefined || location.accuracyMeters === undefined || location.distanceMeters === undefined) return;
    const sequence = validateAttendanceSequence(employeeEvents, action);
    if (!sequence.valid) { setNotice(sequence.message); return; }
    const request = captureRequest + 1;
    setCaptureRequest(request);
    const result = captureAttendance({ employeeId: employee.id, branchId: branch.id, type: action, latitude: location.latitude, longitude: location.longitude, accuracyMeters: location.accuracyMeters, distanceFromBranchMeters: location.distanceMeters, geofenceRadiusMeters: branch.geofenceRadiusMeters, livePhotoSessionKey: `live-frame-session-${request}` });
    setNotice(result.message);
  }

  if (state === "loading") return <AttendanceSkeleton />;
  if (state === "error") return <Card className="attendance-state"><h3>تعذر تجهيز التسجيل</h3><p>Reference Code: ATT-CAPTURE-MOCK-503</p><Link className="ui-button ui-button--secondary ui-button--md" href="/attendance/check">إعادة المحاولة</Link></Card>;
  if (!branch) return <PermissionDeniedState />;
  return (
    <div className="attendance-page attendance-check-page" data-attendance-employee={employee.id}>
      {offline ? <div className="attendance-offline"><WifiOff aria-hidden size={17} />دون اتصال — السجل السابق متاح، ولا توجد Offline Queue.</div> : null}
      <header className="attendance-page-header"><div><span>تسجيل شخصي آمن</span><h2>الحضور والانصراف</h2><p>{employee.name} · <bdi>{employee.employeeNumber}</bdi></p></div><Link className="attendance-text-link" href="/attendance/my">عرض سجلي الشخصي</Link></header>
      <div className="attendance-check-grid">
        <Card className="attendance-check-context">
          <header><div><Clock3 aria-hidden size={21} /><strong>بيانات التسجيل</strong></div><Badge tone={offline ? "danger" : "success"}>{offline ? "غير متصل" : "متصل"}</Badge></header>
          <dl><div><dt>التاريخ والوقت — مصر</dt><dd>{new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "full", timeStyle: "medium", timeZone: "Africa/Cairo" }).format(clock)}</dd></div><div><dt>الدور أو الأدوار</dt><dd>{employee.roleAssignments.filter((item) => item.active).map((item) => ROLE_TEMPLATES[item.roleKey].shortLabelAr).join("، ")}</dd></div><div><dt>آخر تسجيل</dt><dd>{lastEvent ? `${lastEvent.type === "check_in" ? "حضور" : "انصراف"} · ${formatEgyptTime(lastEvent.capturedAt)}` : "لا يوجد تسجيل سابق"}</dd></div></dl>
          <label className="attendance-branch-control"><span>الفرع المسند</span>{allowedBranches.length === 1 ? <strong>{branch.name} · {branch.code}</strong> : <select value={branch.id} onChange={(event) => setBranchId(event.target.value)}>{allowedBranches.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select>}</label>
        </Card>
        <AttendanceCameraCapture onStateChange={setCameraState} captureRequest={captureRequest} />
        <AttendanceLocationStatus branch={branch} onChange={locationChange} />
        <Card className="attendance-check-actions">
          <div className="attendance-readiness"><span><Camera aria-hidden size={18} />الكاميرا: {cameraState === "ready" ? "جاهزة" : "غير جاهزة"}</span><span><MapPin aria-hidden size={18} />الموقع: {location.state === "ready" ? "محدد" : "غير محدد"}</span><span>{offline ? <WifiOff aria-hidden size={18} /> : <Wifi aria-hidden size={18} />}الاتصال: {offline ? "غير متصل" : "متصل"}</span></div>
          {notice ? <p className="attendance-notice" role="status">{notice}</p> : null}
          <Button className="attendance-capture-button" size="lg" variant="primary" disabled={!ready} onClick={submit} icon={ready ? <CheckCircle2 aria-hidden size={21} /> : <ShieldAlert aria-hidden size={21} />}>{action === "check_in" ? "تسجيل حضور" : "تسجيل انصراف"}</Button>
          {!ready ? <p>يلزم بث كاميرا مباشر وموقع صالح واتصال قبل التسجيل.</p> : null}
          <Link className="attendance-exception-link" href="/attendance/my?request=exception">تعذر شرط؟ اطلب استثناء بدل تجاوزه</Link>
        </Card>
      </div>
    </div>
  );
}
