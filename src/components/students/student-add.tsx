"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/index";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, Save, Loader2, Upload, Camera, X, RefreshCw } from "lucide-react";

import { CredentialsDialog } from "@/components/ui/credentials-dialog";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClassItem {
  id: string;
  title: string;
}

const BASIC_OPTIONS = ["None", "Basic7", "Basic8", "Basic9"];
const DEPARTMENT_OPTIONS = ["None", "Science", "Art", "Commerce"];

export default function StudentAddView() {
  const navigate = useAppStore((s) => s.navigate);

  // Form state
  const [regNo, setRegNo] = useState("");
  const [fullname, setFullname] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [classRef, setClassRef] = useState("");
  const [basic, setBasic] = useState("");
  const [department, setDepartment] = useState("");
  const [parentNo, setParentNo] = useState("");
  const [stateOfOrigin, setStateOfOrigin] = useState("");
  const [lga, setLga] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [regLoading, setRegLoading] = useState(true);
  const [regRefreshing, setRegRefreshing] = useState(false);

  // Credentials dialog state
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credLoginId, setCredLoginId] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [credUserName, setCredUserName] = useState("");

  // Photo upload handler
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only image files are allowed (JPEG, PNG, GIF, WebP)");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        return;
      }

      setImageUrl(data.url);
      toast.success("Photo uploaded successfully!");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  }

  // Auto-generate registration number
  async function generateRegNo(showRefreshing = false) {
    if (showRefreshing) setRegRefreshing(true);
    else setRegLoading(true);

    try {
      const res = await fetch("/api/students/generate-reg");
      const data = await res.json();

      if (res.ok && data.success) {
        setRegNo(data.regNo);
      } else {
        toast.error(data.message || "Failed to generate reg number");
      }
    } catch {
      toast.error("Failed to generate registration number");
    } finally {
      setRegLoading(false);
      setRegRefreshing(false);
    }
  }

  // Fetch classes and generate reg number on mount
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch("/api/classes");
        if (res.ok) {
          const data = await res.json();
          setClasses(Array.isArray(data) ? data : []);
        }
      } catch {
        toast.error("Failed to load classes");
      } finally {
        setLoadingClasses(false);
      }
    }
    fetchClasses();
    generateRegNo();
  }, []);

  // Reset form
  function resetForm() {
    setFullname("");
    setGender("");
    setDateOfBirth("");
    setStudentClass("");
    setClassRef("");
    setBasic("");
    setDepartment("");
    setParentNo("");
    setStateOfOrigin("");
    setLga("");
    setHomeAddress("");
    setImageUrl("");
    // Re-generate reg number for next student
    generateRegNo();
  }

  // Submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fullname.trim()) {
      toast.error("Fullname is required");
      return;
    }
    if (!studentClass) {
      toast.error("Class is required");
      return;
    }
    if (!regNo.trim()) {
      toast.error("Registration number is required");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        regNo: regNo.trim(),
        fullname: fullname.trim(),
        gender,
        dateOfBirth,
        class: studentClass,
        classRef,
        basic,
        department,
        parentNo: parentNo.trim(),
        stateOfOrigin: stateOfOrigin.trim(),
        lga: lga.trim(),
        homeAddress: homeAddress.trim(),
        imageUrl: imageUrl.trim(),
      };

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to add student");
        return;
      }

      toast.success("Student added successfully!");

      // Show credentials dialog
      if (data.credentials) {
        setCredLoginId(data.credentials.loginId);
        setCredPassword(data.credentials.defaultPassword);
        setCredUserName(fullname.trim());
        setCredentialsOpen(true);
      }

      resetForm();
      navigate("students");
    } catch {
      toast.error("An error occurred while adding the student");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("students")}
          className="shrink-0"
        >
          <ArrowLeft className="size-5" />
          <span className="sr-only">Back to Students</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Add New Student
          </h1>
          <p className="text-sm text-muted-foreground">
            Fill in the details below to register a new student
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            Student Registration Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Personal Information
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="regNo">
                    Reg Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="regNo"
                      placeholder="Auto-generating..."
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      required
                      readOnly={regLoading}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => generateRegNo(true)}
                      disabled={regRefreshing}
                      title="Generate new reg number"
                      className="shrink-0"
                    >
                      <RefreshCw className={`size-4 ${regRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto-generated from your school name and session
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullname">
                    Fullname <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullname"
                    placeholder="Enter student's full name"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            {/* Academic Information */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Academic Information
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="studentClass">
                    Class <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={studentClass}
                    onValueChange={setStudentClass}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          loadingClasses
                            ? "Loading classes..."
                            : "Select class"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.title}>
                          {cls.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="basic">Basic Level</Label>
                  <Select value={basic} onValueChange={setBasic}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select basic level" />
                    </SelectTrigger>
                    <SelectContent>
                      {BASIC_OPTIONS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENT_OPTIONS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </fieldset>

            {/* Passport Photo */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Passport Photograph
              </legend>
              <div className="flex items-start gap-5">
                <div className="relative group">
                  <Avatar className="h-24 w-24 rounded-lg border-2 border-emerald-200">
                    {imageUrl ? (
                      <AvatarImage src={imageUrl} alt="Student passport" className="object-cover" />
                    ) : null}
                    <AvatarFallback className="rounded-lg bg-emerald-50">
                      <Camera className="h-8 w-8 text-emerald-300" />
                    </AvatarFallback>
                  </Avatar>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                      title="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>Upload Photo</Label>
                    <div className="mt-1.5 flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("photo-upload")?.click()}
                        disabled={!!uploading}
                      >
                        {uploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {uploading ? "Uploading..." : "Browse Files"}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        JPEG, PNG, GIF or WebP (max 5MB)
                      </span>
                    </div>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>
                  <div>
                    <Label htmlFor="imageUrl" className="text-xs text-muted-foreground">Or paste image URL</Label>
                    <Input
                      id="imageUrl"
                      placeholder="https://example.com/photo.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Contact Information */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Contact Information
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="parentNo">Parent Phone</Label>
                  <Input
                    id="parentNo"
                    type="tel"
                    placeholder="e.g. 08012345678"
                    value={parentNo}
                    onChange={(e) => setParentNo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stateOfOrigin">State of Origin</Label>
                  <Input
                    id="stateOfOrigin"
                    placeholder="Enter state"
                    value={stateOfOrigin}
                    onChange={(e) => setStateOfOrigin(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lga">LGA</Label>
                  <Input
                    id="lga"
                    placeholder="Enter local government area"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeAddress">Home Address</Label>
                <Textarea
                  id="homeAddress"
                  placeholder="Enter home address"
                  rows={3}
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                />
              </div>
            </fieldset>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("students")}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Save Student
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Credentials Dialog */}
      <CredentialsDialog
        open={credentialsOpen}
        onOpenChange={setCredentialsOpen}
        role="Student"
        loginId={credLoginId}
        defaultPassword={credPassword}
        userName={credUserName}
      />
    </div>
  );
}
