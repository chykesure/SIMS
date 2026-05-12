"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { PenTool, Save, Upload } from "lucide-react";
import { useAppStore } from "@/store/index";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SignatureData {
  id?: string;
  name: string;
  imageUrl: string;
}

export default function SignaturesView() {
  const { currentPage } = useAppStore();
  const [teacherSig, setTeacherSig] = useState<SignatureData>({
    name: "",
    imageUrl: "",
  });
  const [principalSig, setPrincipalSig] = useState<SignatureData>({
    name: "",
    imageUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"teacher" | "principal" | null>(null);

  const fetchSignatures = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings?type=signatures");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data.teacherSignature) {
        setTeacherSig({
          id: data.teacherSignature.id,
          name: data.teacherSignature.name || "",
          imageUrl: data.teacherSignature.imageUrl || "",
        });
      }
      if (data.principalSignature) {
        setPrincipalSig({
          id: data.principalSignature.id,
          name: data.principalSignature.name || "",
          imageUrl: data.principalSignature.imageUrl || "",
        });
      }
    } catch {
      toast.error("Failed to load signatures");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentPage === "signatures") fetchSignatures();
  }, [currentPage, fetchSignatures]);

  const handleSave = async (type: "teacher" | "principal") => {
    const sig = type === "teacher" ? teacherSig : principalSig;
    const payload = {
      type: type === "teacher" ? "teacher-signature" : "principal-signature",
      name: sig.name,
      imageUrl: sig.imageUrl,
    };
    try {
      setSaving(type);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success(
        `${type === "teacher" ? "Teacher" : "Principal"} signature saved`
      );
      fetchSignatures();
    } catch {
      toast.error("Failed to save signature");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <PenTool className="h-5 w-5" />
        <h2 className="text-lg font-semibold md:text-xl">
          Signature Management
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Teacher Signature */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teacher Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 rounded-lg border">
                {teacherSig.imageUrl ? (
                  <AvatarImage
                    src={teacherSig.imageUrl}
                    alt="Teacher signature"
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-lg bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground/50" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">
                  {teacherSig.name || "No name set"}
                </p>
                {teacherSig.imageUrl ? (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {teacherSig.imageUrl}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No image uploaded
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-name">Name</Label>
              <Input
                id="teacher-name"
                placeholder="Enter teacher name"
                value={teacherSig.name}
                onChange={(e) =>
                  setTeacherSig((s) => ({ ...s, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-image">Image URL</Label>
              <Input
                id="teacher-image"
                placeholder="Enter signature image URL"
                value={teacherSig.imageUrl}
                onChange={(e) =>
                  setTeacherSig((s) => ({ ...s, imageUrl: e.target.value }))
                }
              />
            </div>
            {teacherSig.imageUrl && (
              <div className="rounded-lg border bg-muted/30 p-2">
                <img
                  src={teacherSig.imageUrl}
                  alt="Teacher signature preview"
                  className="mx-auto max-h-24 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <Button
              onClick={() => handleSave("teacher")}
              disabled={saving === "teacher"}
              className="w-full gap-2"
            >
              {saving === "teacher" ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Teacher Signature
            </Button>
          </CardContent>
        </Card>

        {/* Principal Signature */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Principal Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 rounded-lg border">
                {principalSig.imageUrl ? (
                  <AvatarImage
                    src={principalSig.imageUrl}
                    alt="Principal signature"
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-lg bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground/50" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">
                  {principalSig.name || "No name set"}
                </p>
                {principalSig.imageUrl ? (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {principalSig.imageUrl}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No image uploaded
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="principal-name">Name</Label>
              <Input
                id="principal-name"
                placeholder="Enter principal name"
                value={principalSig.name}
                onChange={(e) =>
                  setPrincipalSig((s) => ({ ...s, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="principal-image">Image URL</Label>
              <Input
                id="principal-image"
                placeholder="Enter signature image URL"
                value={principalSig.imageUrl}
                onChange={(e) =>
                  setPrincipalSig((s) => ({ ...s, imageUrl: e.target.value }))
                }
              />
            </div>
            {principalSig.imageUrl && (
              <div className="rounded-lg border bg-muted/30 p-2">
                <img
                  src={principalSig.imageUrl}
                  alt="Principal signature preview"
                  className="mx-auto max-h-24 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <Button
              onClick={() => handleSave("principal")}
              disabled={saving === "principal"}
              className="w-full gap-2"
            >
              {saving === "principal" ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Principal Signature
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
