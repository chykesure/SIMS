"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/index";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Upload,
  Camera,
  X,
  Building2,
  Palette,
  Phone,
  Mail,
  Globe,
  MapPin,
  Shield,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export default function SchoolProfilePage() {
  const { tenant, setTenant, navigate } = useAppStore();

  const [name, setName] = useState("");
  const [motto, setMotto] = useState("");
  const [logo, setLogo] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current tenant data
  useEffect(() => {
    async function loadTenant() {
      try {
        const res = await fetch("/api/tenant");
        const data = await res.json();
        if (data.success && data.data) {
          const t = data.data;
          setName(t.name || "");
          setMotto(t.motto || "");
          setLogo(t.logo || "");
          setPrimaryColor(t.primaryColor || "#821329");
          setAddress(t.address || "");
          setPhone(t.phone || "");
          setEmail(t.email || "");
          setWebsite(t.website || "");
          setState(t.state || "");
        }
      } catch {
        toast.error("Failed to load school information");
      } finally {
        setLoading(false);
      }
    }
    loadTenant();
  }, []);

  // Logo upload
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast.error("Logo must be less than 1MB");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, GIF, or WebP images allowed");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setLogo(data.url);
        toast.success("Logo uploaded!");
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  // Save
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("School name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tenant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          motto: motto.trim(),
          logo: logo.trim(),
          primaryColor: primaryColor.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          website: website.trim(),
          state: state.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Update Zustand store with new tenant data
        setTenant(data.data);
        toast.success("School profile updated successfully!");
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("dashboard")} className="shrink-0">
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">School Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your school information, logo, and branding</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ─── Logo Section ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-5 text-primary" />
              School Logo
            </CardTitle>
            <CardDescription>Upload your school logo. It appears on report cards and the sidebar.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="h-28 w-28 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/30">
                  {logo ? (
                    <img src={logo} alt="School logo" className="h-full w-full object-contain p-2" />
                  ) : (
                    <div className="text-center">
                      <Camera className="mx-auto h-8 w-8 text-muted-foreground/40" />
                      <p className="mt-1 text-xs text-muted-foreground/60">No logo</p>
                    </div>
                  )}
                </div>
                {logo && (
                  <button
                    type="button"
                    onClick={() => setLogo("")}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploading ? "Uploading..." : "Upload New Logo"}
                </Button>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="text-xs text-muted-foreground">Recommended: Square PNG, at least 200x200px, max 1MB</p>
                <div>
                  <Label className="text-xs text-muted-foreground">Or paste image URL</Label>
                  <Input
                    placeholder="https://example.com/logo.png"
                    value={logo.startsWith("data:") ? "" : logo}
                    onChange={(e) => setLogo(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Basic Info ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-5 text-primary" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">School Name <span className="text-destructive">*</span></Label>
                <Input id="name" placeholder="Enter school name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="motto">School Motto</Label>
                <Input id="motto" placeholder="e.g. Excellence in Learning" value={motto} onChange={(e) => setMotto(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Brand Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border"
                  />
                  <Input
                    placeholder="#821329"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Contact Info ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-5 text-primary" />
              Contact Information
            </CardTitle>
            <CardDescription>Appears on report cards and school documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" placeholder="School address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" placeholder="e.g. Lagos" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="e.g. 08012345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="e.g. school@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="e.g. www.schoolname.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Actions ─── */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("dashboard")} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="mr-2 size-4" /> Save Changes</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}