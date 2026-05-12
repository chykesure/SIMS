"use client";

import {
  Award,
  GraduationCap,
  BookOpen,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface GradeRow {
  grade: string;
  min: number;
  max: number;
  remark: string;
  color: string;
  textColor: string;
}

const JSS_GRADES: GradeRow[] = [
  { grade: "A", min: 70, max: 100, remark: "Excellent", color: "bg-emerald-500", textColor: "text-emerald-700" },
  { grade: "B", min: 60, max: 69, remark: "Very Good", color: "bg-teal-500", textColor: "text-teal-700" },
  { grade: "C", min: 50, max: 59, remark: "Good", color: "bg-yellow-500", textColor: "text-yellow-700" },
  { grade: "P", min: 40, max: 49, remark: "Pass", color: "bg-orange-500", textColor: "text-orange-700" },
  { grade: "F", min: 0, max: 39, remark: "Fail", color: "bg-red-500", textColor: "text-red-700" },
];

const SSS_GRADES: GradeRow[] = [
  { grade: "A1", min: 75, max: 100, remark: "Distinction", color: "bg-emerald-500", textColor: "text-emerald-700" },
  { grade: "B2", min: 70, max: 74, remark: "Very Good", color: "bg-teal-500", textColor: "text-teal-700" },
  { grade: "B3", min: 65, max: 69, remark: "Good", color: "bg-cyan-500", textColor: "text-cyan-700" },
  { grade: "C4", min: 60, max: 64, remark: "Credit", color: "bg-sky-500", textColor: "text-sky-700" },
  { grade: "C5", min: 55, max: 59, remark: "Credit", color: "bg-blue-500", textColor: "text-blue-700" },
  { grade: "C6", min: 50, max: 54, remark: "Credit", color: "bg-indigo-500", textColor: "text-indigo-700" },
  { grade: "D7", min: 45, max: 49, remark: "Pass", color: "bg-yellow-500", textColor: "text-yellow-700" },
  { grade: "E8", min: 40, max: 44, remark: "Pass", color: "bg-orange-500", textColor: "text-orange-700" },
  { grade: "F9", min: 0, max: 39, remark: "Fail", color: "bg-red-500", textColor: "text-red-700" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GradingView() {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grading System</h1>
          <p className="text-sm text-muted-foreground">
            Official grading scales for Junior and Senior secondary levels
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint} className="print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Info banner */}
      <Card className="border-0 bg-gradient-to-r from-slate-800 to-slate-900 print:bg-gray-800">
        <CardContent className="flex items-center gap-3 p-4 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Grading Policy</p>
            <p className="text-xs text-slate-300">
              Assessment is based on Continuous Assessment (30%) and Examination (70%). Total = 100 marks.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Two grading tables side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- JSS ---- */}
        <Card className="print:shadow-none print:border-gray-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <GraduationCap className="h-4 w-4 text-emerald-700" />
              </div>
              Junior Secondary (JSS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border print:border-gray-300">
              <Table>
                <TableHeader>
                  <TableRow className="bg-emerald-50 print:bg-emerald-100">
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-center">Score Range</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {JSS_GRADES.map((g) => (
                    <TableRow key={g.grade}>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white ${g.color}`}
                        >
                          {g.grade}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm font-medium">
                        {g.min} – {g.max}
                      </TableCell>
                      <TableCell>
                        <span className={g.textColor}>{g.remark}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            g.min >= 40
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 print:bg-white"
                              : "border-red-300 bg-red-50 text-red-700 print:bg-white"
                          }
                        >
                          {g.min >= 40 ? "Pass" : "Fail"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ---- SSS ---- */}
        <Card className="print:shadow-none print:border-gray-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <BookOpen className="h-4 w-4 text-amber-700" />
              </div>
              Senior Secondary (SSS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border print:border-gray-300">
              <Table>
                <TableHeader>
                  <TableRow className="bg-amber-50 print:bg-amber-100">
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-center">Score Range</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SSS_GRADES.map((g) => (
                    <TableRow key={g.grade}>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white ${g.color}`}
                        >
                          {g.grade}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm font-medium">
                        {g.min} – {g.max}
                      </TableCell>
                      <TableCell>
                        <span className={g.textColor}>{g.remark}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            g.min >= 40
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 print:bg-white"
                              : "border-red-300 bg-red-50 text-red-700 print:bg-white"
                          }
                        >
                          {g.min >= 40 ? "Pass" : "Fail"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="print:hidden" />

      {/* Summary notes */}
      <Card className="print:shadow-none print:border-gray-300">
        <CardContent className="space-y-3 p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4" />
            Grading Summary
          </h3>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-slate-50 p-4 print:border-gray-300">
              <p className="mb-2 font-medium text-emerald-700">Junior Secondary (JSS)</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Continuous Assessment: <strong>30 marks</strong> (1st CA 15 + 2nd CA 15)</li>
                <li>• Examination: <strong>70 marks</strong></li>
                <li>• Total: <strong>100 marks</strong></li>
                <li>• Pass mark: <strong>40%</strong></li>
              </ul>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4 print:border-gray-300">
              <p className="mb-2 font-medium text-amber-700">Senior Secondary (SSS)</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Continuous Assessment: <strong>30 marks</strong> (1st CA 15 + 2nd CA 15)</li>
                <li>• Examination: <strong>70 marks</strong></li>
                <li>• Total: <strong>100 marks</strong></li>
                <li>• Pass mark: <strong>40%</strong></li>
                <li>• WAEC/NECO aligned grading scale (A1–F9)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print-only footer */}
      <div className="hidden print:block text-center text-xs text-gray-400 pt-4">
        Reality High School — Official Grading System — Generated from School Management System
      </div>
    </div>
  );
}
