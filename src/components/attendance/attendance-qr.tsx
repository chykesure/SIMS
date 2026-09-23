// src/components/attendance/attendance-qr.tsx
// QR Attendance (Model A — Teacher Scanner):
//  - open a register, then scan student QR cards with the device camera
//    (native BarcodeDetector, Chrome/Edge/Android) or type the regNo/ID manually.
//  - print student QR cards (qrcode.react) for the whole class.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode, Loader2, Camera, CameraOff, Keyboard, Printer, CheckCircle2, Lock, ScanLine, Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { STATUS_META, todayStr } from "@/components/attendance/attendance-view";

interface ScanResult {
  studentId: string;
  regNo: string;
  fullname: string;
  duplicate: boolean;
  message: string;
}

interface SessionInfo {
  id: string;
  class: string;
  date: string;
  status: "ACTIVE" | "CLOSED";
}

// ---- BarcodeDetector feature detection (not in TS DOM lib yet) ----
interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

export function QrTab({ classes, onSaved }: { classes: string[]; onSaved: () => void }) {
  const [klass, setKlass] = useState("");
  const [date, setDate] = useState(todayStr());
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [starting, setStarting] = useState(false);

  // scanning
  const [camSupported, setCamSupported] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const [feed, setFeed] = useState<ScanResult[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });

  // QR cards dialog
  const [cardsOpen, setCardsOpen] = useState(false);
  const [cardsClass, setCardsClass] = useState("");
  const [cardsStudents, setCardsStudents] = useState<{ id: string; regNo: string; fullname: string }[] | null>(null);
  const [cardsLoading, setCardsLoading] = useState(false);

  useEffect(() => {
    setCamSupported(!!getBarcodeDetector());
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = async () => {
    if (!klass) { toast.error("Select a class"); return; }
    setStarting(true);
    try {
      const res = await fetch("/api/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class: klass, date, mode: "QR_TEACHER" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to start");
      setSession(json.data);
      setFeed([]);
      toast.success(json.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start");
    } finally {
      setStarting(false);
    }
  };

  const doScan = useCallback(async (payload: string) => {
    if (!session || session.status !== "ACTIVE") return;
    setScanning(true);
    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, payload: payload.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        // server-side rejection (wrong class, bad QR, closed, ...) — show as error toast
        toast.error(json.message || "Scan rejected");
        return;
      }
      const d = json.data as {
        duplicate: boolean;
        student: { id: string; regNo: string; fullname: string };
        message: string;
      };
      setFeed((f) => [
        {
          studentId: d.student.id,
          regNo: d.student.regNo,
          fullname: d.student.fullname,
          duplicate: d.duplicate,
          message: json.message as string,
        },
        ...f.slice(0, 19),
      ]);
      if (d.duplicate) toast.info(json.message);
      else toast.success(json.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [session]);

  // ---- camera loop ----
  const stopCamera = () => {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setCamOn(false);
  };

  const startCamera = async () => {
    const Ctor = getBarcodeDetector();
    if (!Ctor) {
      toast.error("Camera scanning needs Chrome, Edge or Android Chrome. Use manual entry instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamOn(true);
      const detector = new Ctor({ formats: ["qr_code"] });
      loopRef.current = setInterval(async () => {
        if (!videoRef.current || !session) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue;
          if (!value) return;
          const now = Date.now();
          if (lastScanRef.current.value === value && now - lastScanRef.current.at < 2500) return; // cooldown
          lastScanRef.current = { value, at: now };
          doScan(value);
        } catch {
          /* transient decode errors — keep looping */
        }
      }, 350);
    } catch {
      toast.error("Could not access the camera. Check permissions or use manual entry.");
      stopCamera();
    }
  };

  // manual entry accepts regNo OR a pasted QR payload (SIMS1:<id>)
  const submitManual = async () => {
    const value = manual.trim();
    if (!value) return;
    if (!value.startsWith("SIMS1:")) {
      // resolve regNo -> student via roster lookup through scan API is not possible;
      // so resolve locally by fetching roster once and mapping regNo -> SIMS1 payload
      try {
        const res = await fetch(`/api/students?class=${encodeURIComponent(session?.class || "")}`);
        const json = await res.json();
        const list = json?.data ?? json ?? [];
        const found = list.find(
          (s: { regNo: string; fullname: string }) =>
            s.regNo.toLowerCase() === value.toLowerCase() || s.fullname.toLowerCase() === value.toLowerCase()
        );
        if (!found) { toast.error(`No student with reg number "${value}" in this class`); return; }
        doScan(`SIMS1:${found.id}`);
        setManual("");
        return;
      } catch {
        toast.error("Lookup failed — paste the QR value (SIMS1:...) instead");
        return;
      }
    }
    doScan(value);
    setManual("");
  };

  // ---- QR cards ----
  const loadCards = async () => {
    if (!cardsClass) { toast.error("Select a class"); return; }
    setCardsLoading(true);
    try {
      const res = await fetch(`/api/students?class=${encodeURIComponent(cardsClass)}`);
      const json = await res.json();
      const list = json?.data ?? json ?? [];
      setCardsStudents(list.map((s: { id: string; regNo: string; fullname: string }) => ({ id: s.id, regNo: s.regNo, fullname: s.fullname })));
    } catch {
      toast.error("Failed to load students");
    } finally {
      setCardsLoading(false);
    }
  };

  const closeRegister = async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/attendance/sessions/${session.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      setSession({ ...session, status: "CLOSED" });
      stopCamera();
      toast.success("Register closed");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to close");
    }
  };

  const presentCount = feed.filter((f) => !f.duplicate).length;

  // ---------- setup view ----------
  if (!session) {
    return (
      <div className="space-y-4">
        <Card className="border shadow-sm">
          <CardContent className="mx-auto max-w-lg space-y-4 p-6">
            <div className="text-center">
              <h3 className="flex items-center justify-center gap-2 font-semibold">
                <ScanLine className="size-4 text-emerald-600" /> QR Attendance — Teacher Scanner
              </h3>
              <p className="text-sm text-muted-foreground">
                Open a register, then scan each student&apos;s QR card. Each student is marked PRESENT once.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Class *</Label>
                <Select value={klass || undefined} onValueChange={setKlass}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={startSession} disabled={starting}>
              {starting ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />} Start QR Attendance
            </Button>
          </CardContent>
        </Card>

        {/* Printable QR cards */}
        <Card className="border shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold"><Printer className="size-4" /> Student QR cards</p>
              <p className="text-xs text-muted-foreground">Print wallet-size QR cards for a class — one card per student, unique and permanent.</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={cardsClass || undefined} onValueChange={setCardsClass}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" onClick={() => { setCardsOpen(true); setCardsStudents(null); }}>
                <Printer className="size-4" /> Print cards
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- scanner view ----------
  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold">{session.class} — QR register</p>
            <p className="text-xs text-muted-foreground">
              {date} · {presentCount} scanned present{scanning ? " · reading..." : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={session.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600"}>
              {session.status === "ACTIVE" ? "Active" : "Closed"}
            </Badge>
            {session.status === "ACTIVE" ? (
              <>
                {camOn ? (
                  <Button variant="outline" size="sm" onClick={stopCamera}><CameraOff className="size-4" /> Stop camera</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={startCamera} disabled={!camSupported}>
                    <Camera className="size-4" /> {camSupported ? "Start camera" : "No camera API"}
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={closeRegister}><Lock className="size-4" /> Close register</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setSession(null)}>New register</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Camera / manual */}
        <Card className="border shadow-sm">
          <CardContent className="space-y-3 p-5">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-950">
              <video ref={videoRef} playsInline muted className="size-full object-cover" />
              {!camOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <QrCode className="size-10" />
                  <p className="text-xs">{camSupported ? "Press “Start camera” and hold QR cards up to the lens" : "Camera scanning needs Chrome / Edge"}</p>
                </div>
              )}
              {camOn && (
                <div className="pointer-events-none absolute inset-x-10 inset-y-8 rounded-lg border-2 border-emerald-400/80" />
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Keyboard className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitManual()}
                  placeholder="Manual: type reg number or paste SIMS1:..."
                  className="pl-8"
                  disabled={session.status !== "ACTIVE"}
                />
              </div>
              <Button onClick={submitManual} disabled={session.status !== "ACTIVE" || !manual.trim()}>Mark</Button>
            </div>
          </CardContent>
        </Card>

        {/* Scan feed */}
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <p className="mb-3 flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2"><ScanLine className="size-4" /> Scan feed</span>
              <span className="text-xs font-normal text-muted-foreground">{feed.length} scan(s)</span>
            </p>
            {feed.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Users className="size-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Scanned students will appear here as they are marked present.</p>
              </div>
            ) : (
              <div className="max-h-80 space-y-1.5 overflow-y-auto">
                {feed.map((f, i) => (
                  <div key={`${f.studentId}-${i}`} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                    <CheckCircle2 className={`size-4 shrink-0 ${f.duplicate ? "text-amber-500" : "text-emerald-600"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.fullname}</p>
                      <p className="truncate text-xs text-muted-foreground">{f.regNo}{f.duplicate ? " · already marked" : ""}</p>
                    </div>
                    <Badge variant="outline" className={STATUS_META.PRESENT.className}>P</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR cards dialog */}
      <Dialog open={cardsOpen} onOpenChange={setCardsOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student QR cards — {cardsClass || "select a class"}</DialogTitle>
            <DialogDescription>
              Each card carries a unique signed-format code (SIMS1:&lt;studentId&gt;). Print, cut and hand out.
            </DialogDescription>
          </DialogHeader>

          {!cardsStudents ? (
            <div className="flex justify-center py-6">
              <Button onClick={loadCards} disabled={cardsLoading || !cardsClass}>
                {cardsLoading ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />} Load {cardsClass || "class"}
              </Button>
            </div>
          ) : cardsStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No students in this class.</p>
          ) : (
            <>
              <div className="qr-cards-print-area grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cardsStudents.map((s) => (
                  <div key={s.id} className="flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center">
                    <QRCodeSVG value={`SIMS1:${s.id}`} size={96} />
                    <p className="w-full truncate text-xs font-bold">{s.fullname}</p>
                    <p className="text-[10px] text-muted-foreground">{s.regNo}</p>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCardsOpen(false)}>Close</Button>
                <Button onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}