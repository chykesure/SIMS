import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLockedKeys } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const severityFilter = searchParams.get("severity");
    const eventTypeFilter = searchParams.get("eventType");

    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 500) : 100;

    // Build the where clause
    const where: Record<string, unknown> = {};
    if (severityFilter && severityFilter !== "all") {
      where.severity = severityFilter;
    }
    if (eventTypeFilter && eventTypeFilter !== "all") {
      where.eventType = eventTypeFilter;
    }

    // Fetch audit log entries
    const events = await db.securityAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Calculate stats
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const totalEvents = await db.securityAuditLog.count();
    const criticalCount = await db.securityAuditLog.count({
      where: { severity: "critical" },
    });
    const warningCount = await db.securityAuditLog.count({
      where: { severity: "warning" },
    });
    const loginFailures24h = await db.securityAuditLog.count({
      where: {
        eventType: "login_failed",
        createdAt: { gte: twentyFourHoursAgo },
      },
    });
    const rateLimitedCount = await db.securityAuditLog.count({
      where: {
        eventType: "rate_limited",
        createdAt: { gte: twentyFourHoursAgo },
      },
    });
    const bruteForceCount = await db.securityAuditLog.count({
      where: {
        eventType: "brute_force_detected",
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    // Get currently locked keys from in-memory rate limiter
    const lockedEntries = getLockedKeys();
    const rateLimitedIps = lockedEntries.map((entry) => ({
      key: entry.key,
      failures: entry.failures,
      lockoutMinutes: Math.ceil(
        (entry.lockoutUntil - Date.now()) / (60 * 1000)
      ),
    }));

    // Top suspicious emails (most login_failed events in 24h)
    const suspiciousEmails = await db.securityAuditLog.groupBy({
      by: ["email"],
      where: {
        eventType: { in: ["login_failed", "brute_force_detected"] },
        createdAt: { gte: twentyFourHoursAgo },
        email: { not: "" },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 10,
    });

    // Group events by eventType for chart data
    const eventsByType = await db.securityAuditLog.groupBy({
      by: ["eventType"],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Group events by severity for distribution
    const eventsBySeverity = await db.securityAuditLog.groupBy({
      by: ["severity"],
      _count: {
        id: true,
      },
    });

    // Recent critical events (last 24h)
    const recentCritical = await db.securityAuditLog.findMany({
      where: {
        severity: "critical",
        createdAt: { gte: twentyFourHoursAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 24h breakdown by event type
    const hourlyBreakdown = await db.securityAuditLog.groupBy({
      by: ["eventType"],
      where: {
        createdAt: { gte: twentyFourHoursAgo },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        events,
        stats: {
          totalEvents,
          criticalCount,
          warningCount,
          infoCount: totalEvents - criticalCount - warningCount,
          loginFailures24h,
          rateLimitedCount24h: rateLimitedCount,
          bruteForceCount24h: bruteForceCount,
          currentlyLockedIps: rateLimitedIps.length,
        },
        currentlyLockedIps: rateLimitedIps,
        topSuspiciousEmails: suspiciousEmails.map((item) => ({
          email: item.email,
          failureCount: item._count.id,
        })),
        eventsByType: eventsByType.map((item) => ({
          eventType: item.eventType,
          count: item._count.id,
        })),
        eventsBySeverity: eventsBySeverity.map((item) => ({
          severity: item.severity,
          count: item._count.id,
        })),
        recentCritical: recentCritical.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          ipAddress: event.ipAddress,
          email: event.email,
          details: event.details,
          createdAt: event.createdAt,
        })),
        hourlyBreakdown: hourlyBreakdown.map((item) => ({
          eventType: item.eventType,
          count: item._count.id,
        })),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        success: false,
        message: `Failed to fetch security data: ${message}`,
      },
      { status: 500 }
    );
  }
}
