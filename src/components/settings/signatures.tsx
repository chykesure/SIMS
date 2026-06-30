"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { PenTool, Save, Upload, ImagePlus, X } from "lucide-react";
import { useAppStore } from "@/store/index";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SignatureData {
  id?: string;
  name: string;
  imageUrl: string;
}

export default function SignaturesView() {
  const { currentPage } = useAppStore();
  const [principalSig, setPrincipalSig] = useState<SignatureData>({
    name: "",
    imageUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSignatures = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings?type=signatures");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data.principalSignature) {
        setPrincipalSig({
          id: data.principalSignature.id,
          name: data.principalSignature.name || "",
          imageUrl: data.principalSignature.imageUrl || "",
        });
      }
    } catch {
      toast.error("Failed to load signature");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentPage === "signatures") fetchSignatures();
  }, [currentPage, fetchSignatures]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, etc.)");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setPrincipalSig((prev) => ({ ...prev, imageUrl: base64 }));
        setUploading(false);
        toast.success("Signature image loaded");
      };
      reader.onerror = () => {
        setUploading(false);
        toast.error("Failed to read image file");
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      toast.error("Failed to process image");
    }
  };

  const removeImage = () => {
    setPrincipalSig((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!principalSig.name.trim()) {
      toast.error("Please enter the principal name");
      return;
    }
    const payload = {
      type: "principal-signature",
      name: principalSig.name,
      imageUrl: principalSig.imageUrl,
    };
    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Principal signature saved");
      fetchSignatures();
    } catch {
      toast.error("Failed to save signature");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mx-auto h-72 max-w-lg animate-pulse rounded-lg bg-muted" />
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

      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Principal Signature</CardTitle>
            <CardDescription>
              Upload the principal&apos;s signature image and enter their name. This will appear on all student report cards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Signature Preview */}
            {principalSig.imageUrl ? (
              <div className="relative rounded-lg border bg-muted/30 p-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20"
                  onClick={removeImage}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <img
                  src={principalSig.imageUrl}
                  alt="Principal signature preview"
                  className="mx-auto max-h-28 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-6 transition-colors hover:border-muted-foreground/50 hover:bg-muted/40"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Click to upload signature image
                </p>
                <p className="text-xs text-muted-foreground/60">
                  PNG, JPG up to 2MB
                </p>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Upload / Change button */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {principalSig.imageUrl ? "Change Signature Image" : "Browse for Signature Image"}
            </Button>

            {/* Principal Name */}
            <div className="space-y-2">
              <Label htmlFor="principal-name">Principal Name</Label>
              <Input
                id="principal-name"
                placeholder="Enter principal name"
                value={principalSig.name}
                onChange={(e) =>
                  setPrincipalSig((s) => ({ ...s, name: e.target.value }))
                }
              />
            </div>

            {/* Save */}
            <Button
              onClick={handleSave}
              disabled={saving || !principalSig.name.trim()}
              className="w-full gap-2"
            >
              {saving ? (
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