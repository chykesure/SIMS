"use client";

import { useState, useEffect, useCallback } from "react";
import { GraduationCap, Plus, Eye, Trash2, Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AdmissionRecord {
  id: string;
  fullname: string;
  gender: string;
  dateOfBirth: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  previousSchool: string;
  desiredClass: string;
  status: string;
  createdAt: string;
}

const CLASS_OPTIONS = ["JSS1", "JSS2", "JSS3", "SSS1", "SSS2", "SSS3"];

const initialFormData = {
  fullname: "",
  gender: "",
  dateOfBirth: "",
  parentName: "",
  parentPhone: "",
  parentEmail: "",
  address: "",
  previousSchool: "",
  desiredClass: "",
};

export default function AdmissionPage() {
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);
  const tenant = useAppStore((s) => s.tenant);

  const schoolName = tenant?.name || "School";
  const primaryColor = tenant?.primaryColor || "#821329";

  const [formData, setFormData] = useState(initialFormData);
  const [records, setRecords] = useState<AdmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewRecord, setViewRecord] = useState<AdmissionRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admission");
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch {
      toast.error("Failed to load admission records");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, status: "Pending" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "Submission failed");
      }

      toast.success("Application submitted", {
        description: `${formData.fullname}'s admission form has been submitted successfully.`,
      });

      setFormData(initialFormData);
      fetchRecords();
    } catch (err) {
      toast.error("Submission failed", {
        description: err instanceof Error ? err.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admission?id=${id}`, { method: "DELETE" });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      toast.success("Record deleted");
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admission", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update status");
      }

      toast.success(`Application ${newStatus.toLowerCase()}`);
      fetchRecords();
      if (viewRecord && viewRecord.id === id) {
        setViewRecord({ ...viewRecord, status: newStatus });
      }
    } catch (err) {
      toast.error("Update failed", {
        description: err instanceof Error ? err.message : "An unexpected error occurred",
      });
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-amber-100 text-amber-800";
      case "Approved":
        return "bg-emerald-100 text-emerald-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("login")}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">{schoolName}</h1>
                <p className="text-xs text-muted-foreground">Admission Portal</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="font-medium">
            {records.length} Applications
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Admission Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Plus className="h-5 w-5" style={{ color: primaryColor }} />
              New Admission Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullname">Full Name</Label>
                  <Input
                    id="fullname"
                    placeholder="Enter student's full name"
                    value={formData.fullname}
                    onChange={(e) => handleInputChange("fullname", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(v) => handleInputChange("gender", v)}
                  >
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
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentName">Parent / Guardian Name</Label>
                  <Input
                    id="parentName"
                    placeholder="Enter parent's full name"
                    value={formData.parentName}
                    onChange={(e) => handleInputChange("parentName", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentPhone">Parent Phone</Label>
                  <Input
                    id="parentPhone"
                    type="tel"
                    placeholder="+234 800 000 0000"
                    value={formData.parentPhone}
                    onChange={(e) => handleInputChange("parentPhone", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentEmail">Parent Email</Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    placeholder="parent@example.com"
                    value={formData.parentEmail}
                    onChange={(e) => handleInputChange("parentEmail", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Home Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter home address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prevSchool">Previous School</Label>
                  <Input
                    id="prevSchool"
                    placeholder="Enter previous school name"
                    value={formData.previousSchool}
                    onChange={(e) => handleInputChange("previousSchool", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desiredClass">Desired Class</Label>
                  <Select
                    value={formData.desiredClass}
                    onValueChange={(v) => handleInputChange("desiredClass", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASS_OPTIONS.map((cls) => (
                        <SelectItem key={cls} value={cls}>
                          {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
                <Badge variant="secondary" className="text-xs">
                  Status: Pending
                </Badge>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Admission Records</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <GraduationCap className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No admission records yet. Submit a form above to get started.
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Gender</TableHead>
                      <TableHead className="hidden md:table-cell">Class</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.fullname}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {record.gender}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {record.desiredClass}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={statusColor(record.status)}
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {user?.role === "Admin" && record.status === "Pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStatusUpdate(record.id, "Approved")}
                                  title="Approve"
                                  className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStatusUpdate(record.id, "Rejected")}
                                  title="Reject"
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewRecord(record)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(record.id)}
                              title="Delete record"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* View Details Dialog */}
      <Dialog open={!!viewRecord} onOpenChange={() => setViewRecord(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <div className="grid gap-3 text-sm">
              <DetailRow label="Full Name" value={viewRecord.fullname} />
              <DetailRow label="Gender" value={viewRecord.gender} />
              <DetailRow label="Date of Birth" value={viewRecord.dateOfBirth} />
              <DetailRow label="Parent Name" value={viewRecord.parentName} />
              <DetailRow label="Parent Phone" value={viewRecord.parentPhone} />
              <DetailRow label="Parent Email" value={viewRecord.parentEmail} />
              <DetailRow label="Address" value={viewRecord.address} />
              <DetailRow label="Previous School" value={viewRecord.previousSchool} />
              <DetailRow label="Desired Class" value={viewRecord.desiredClass} />
              <div className="flex items-center gap-2">
                <span className="w-28 shrink-0 font-medium text-muted-foreground">
                  Status
                </span>
                <Badge
                  variant="secondary"
                  className={statusColor(viewRecord.status)}
                >
                  {viewRecord.status}
                </Badge>
              </div>
              {user?.role === "Admin" && viewRecord.status === "Pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleStatusUpdate(viewRecord.id, "Approved")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    onClick={() => handleStatusUpdate(viewRecord.id, "Rejected")}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-28 shrink-0 font-medium text-muted-foreground">{label}</span>
      <span className="text-foreground">{value || "—"}</span>
    </div>
  );
}
