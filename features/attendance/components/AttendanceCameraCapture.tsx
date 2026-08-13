"use client";

import { Camera, CameraOff, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export type CameraState = "requesting" | "ready" | "denied" | "unavailable";

export function AttendanceCameraCapture({
  onStateChange,
  captureRequest,
}: {
  onStateChange: (state: CameraState) => void;
  captureRequest: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const [state, setState] = useState<CameraState>("requesting");
  const [sessionKey, setSessionKey] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
  }, []);

  const start = useCallback(async () => {
    stop();
    setState("requesting");
    onStateChange("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unavailable");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("ready");
      onStateChange("ready");
    } catch (error) {
      const next = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError") ? "denied" : "unavailable";
      setState(next);
      onStateChange(next);
    }
  }, [onStateChange, stop]);

  useEffect(() => {
    const timer = window.setTimeout(() => void start(), 0);
    return () => { window.clearTimeout(timer); stop(); };
  }, [start, stop]);

  useEffect(() => {
    if (!captureRequest || state !== "ready" || !videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setSessionKey(`live-frame-session-${captureRequest}`);
    canvas.width = 0;
    canvas.height = 0;
  }, [captureRequest, state]);

  return (
    <section className="attendance-camera" data-camera-state={state}>
      <header><div><Camera aria-hidden size={20} /><strong>الكاميرا المباشرة</strong></div><span>{state === "ready" ? "جاهزة" : state === "requesting" ? "جار طلب الإذن" : "غير متاحة"}</span></header>
      <div className="attendance-camera__preview">
        {state === "ready" || state === "requesting" ? <video ref={videoRef} muted playsInline aria-label="معاينة الكاميرا المباشرة" /> : <div><CameraOff aria-hidden size={38} /><p>{state === "denied" ? "تم رفض إذن الكاميرا. لا يمكن التسجيل دون التقاط مباشر." : "لا تتوفر كاميرا مباشرة على هذا الجهاز."}</p><Button icon={<RefreshCw aria-hidden size={16} />} onClick={() => void start()}>إعادة المحاولة</Button></div>}
      </div>
      {sessionKey ? <small role="status">تم التقاط Frame مؤقت للجلسة فقط، دون تخزين دائم.</small> : null}
    </section>
  );
}
