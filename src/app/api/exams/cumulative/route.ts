// ============================================================================
// FILE: src/app/api/exams/cumulative/route.ts
// PURPOSE: Returns cumulative exam data across terms for broadsheet & report card
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const session = searchParams.get("session");
        const class_ = searchParams.get("class");
        const term = searchParams.get("term");
        const tenantId = request.headers.get("x-tenant-id");

        if (!session || !class_ || !term) {
            return NextResponse.json(
                { success: false, message: "session, class, and term are required" },
                { status: 400 }
            );
        }

        /* ------------------------------------------------------------------
           Determine which terms to fetch based on current term
        ------------------------------------------------------------------ */
        const termsToFetch: string[] = [];
        if (term === "First Term") {
            termsToFetch.push("First Term");
        } else if (term === "Second Term") {
            termsToFetch.push("First Term", "Second Term");
        } else if (term === "Third Term") {
            termsToFetch.push("First Term", "Second Term", "Third Term");
        } else {
            return NextResponse.json(
                { success: false, message: "Invalid term. Use First Term, Second Term, or Third Term." },
                { status: 400 }
            );
        }

        /* ------------------------------------------------------------------
           Build Prisma where clause (multi-tenant aware)
        ------------------------------------------------------------------ */
        const where: Record<string, unknown> = {
            session,
            class: class_,
            term: { in: termsToFetch },
        };
        if (tenantId) {
            where.tenantId = tenantId;
        }

        const allScores = await prisma.examScore.findMany({
            where: where as any,
        });

        /* ------------------------------------------------------------------
           Group scores: student → subject → term → { CA scores, total }
        ------------------------------------------------------------------ */
        const studentMap = new Map<
            string,
            Map<
                string,
                Map<
                    string,
                    { firstCa: number; secondCa: number; thirdCa: number; exam: number; total: number }
                >
            >
        >();

        for (const score of allScores) {
            if (!studentMap.has(score.fullname)) {
                studentMap.set(score.fullname, new Map());
            }
            const subjectMap = studentMap.get(score.fullname)!;
            if (!subjectMap.has(score.subject)) {
                subjectMap.set(score.subject, new Map());
            }
            const termMap = subjectMap.get(score.subject)!;
            termMap.set(score.term, {
                firstCa: score.firstCa ?? 0,
                secondCa: score.secondCa ?? 0,
                thirdCa: score.thirdCa ?? 0,
                exam: score.exam ?? 0,
                total: score.total ?? 0,
            });
        }

        /* ------------------------------------------------------------------
           Build cumulative student data (matches broadsheet interface)
        ------------------------------------------------------------------ */
        const students = Array.from(studentMap.entries()).map(
            ([fullname, subjectMap]) => {
                const subjects = Array.from(subjectMap.entries()).map(
                    ([subject, termMap]) => {
                        const firstTerm = termMap.get("First Term") ?? null;
                        const secondTerm = termMap.get("Second Term") ?? null;
                        const thirdTermEntry = termMap.get("Third Term");

                        // Calculate cumulative total for this subject
                        let cumulativeTotal = 0;
                        if (term === "First Term") {
                            cumulativeTotal = firstTerm?.total ?? 0;
                        } else if (term === "Second Term") {
                            cumulativeTotal =
                                (firstTerm?.total ?? 0) + (secondTerm?.total ?? 0);
                        } else if (term === "Third Term") {
                            cumulativeTotal =
                                (firstTerm?.total ?? 0) +
                                (secondTerm?.total ?? 0) +
                                (thirdTermEntry?.total ?? 0);
                        }

                        const subjectData: {
                            subject: string;
                            firstTerm: {
                                firstCa: number;
                                secondCa: number;
                                thirdCa: number;
                                exam: number;
                                total: number;
                            } | null;
                            secondTerm: {
                                firstCa: number;
                                secondCa: number;
                                thirdCa: number;
                                exam: number;
                                total: number;
                            } | null;
                            cumulativeTotal: number;
                            thirdTerm?: {
                                firstCa: number;
                                secondCa: number;
                                thirdCa: number;
                                exam: number;
                                total: number;
                            } | null;
                        } = {
                            subject,
                            firstTerm,
                            secondTerm,
                            cumulativeTotal,
                        };

                        if (thirdTermEntry) {
                            subjectData.thirdTerm = thirdTermEntry;
                        }

                        return subjectData;
                    }
                );

                // Aggregate totals across subjects
                const firstTermTotal = subjects.reduce(
                    (s, sub) => s + (sub.firstTerm?.total ?? 0),
                    0
                );
                const secondTermTotal = subjects.reduce(
                    (s, sub) => s + (sub.secondTerm?.total ?? 0),
                    0
                );
                const thirdTermTotal =
                    term === "Third Term"
                        ? subjects.reduce(
                            (s, sub) => s + (sub.thirdTerm?.total ?? 0),
                            0
                        )
                        : undefined;
                const cumulativeTotal = subjects.reduce(
                    (s, sub) => s + sub.cumulativeTotal,
                    0
                );

                const termCount =
                    term === "Third Term" ? 3 : term === "Second Term" ? 2 : 1;
                const subjectsTaken = subjects.length;
                const cumulativeAverage =
                    subjectsTaken > 0
                        ? parseFloat(
                            (cumulativeTotal / (subjectsTaken * termCount)).toFixed(2)
                        )
                        : 0;
                const cumulativePercentage = parseFloat(
                    cumulativeAverage.toFixed(1)
                );

                const result: {
                    fullname: string;
                    subjects: typeof subjects;
                    firstTermTotal: number;
                    secondTermTotal: number;
                    cumulativeTotal: number;
                    subjectsTaken: number;
                    cumulativeAverage: number;
                    cumulativePercentage: number;
                    thirdTermTotal?: number;
                } = {
                    fullname,
                    subjects,
                    firstTermTotal,
                    secondTermTotal,
                    cumulativeTotal,
                    subjectsTaken,
                    cumulativeAverage,
                    cumulativePercentage,
                };

                if (thirdTermTotal !== undefined) {
                    result.thirdTermTotal = thirdTermTotal;
                }

                return result;
            }
        );

        return NextResponse.json({ success: true, students, term });
    } catch (error: unknown) {
        console.error("Cumulative API error:", error);
        return NextResponse.json(
            {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch cumulative data",
            },
            { status: 500 }
        );
    }
}
