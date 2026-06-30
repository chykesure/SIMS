/**
 * Security Utility Library for SchoolDesk
 * Provides rate limiting, audit logging, input sanitization, and brute force detection.
 */

import { db } from "@/lib/db";

// ==========================================
// Types & Interfaces
// ==========================================

export type SecuritySeverity = "info" | "warning" | "critical";

export type SecurityEventType =
  | "login_failed"
  | "login_success"
  | "login_success_after_failures"
  | "rate_limited"
  | "brute_force_detected"
  | "account_locked"
  | "ip_blocked"
  | "suspicious_activity";

export interface SecurityEvent {
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  email?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  locked: boolean;
  lockoutMinutes: number;
  reason?: string;
}

interface AttemptTracker {
  failures: number;
  firstFailureAt: number;
  lastFailureAt: number;
  lockoutUntil: number;
  recentAttempts: number[]; // timestamps of recent failures
}

// ==========================================
// Constants
// ==========================================

const MAX_FAILURES_TIER_1 = 5; // After 5 failures → 30 min lockout
const LOCKOUT_MINUTES_TIER_1 = 30;

const MAX_FAILURES_TIER_2 = 10; // After 10 failures → 2 hour lockout
const LOCKOUT_MINUTES_TIER_2 = 120; // 2 hours in minutes

const MAX_FAILURES_TIER_3 = 20; // After 20 failures → 24 hour lockout
const LOCKOUT_MINUTES_TIER_3 = 1440; // 24 hours in minutes

const WINDOW_MS = 15 * 60 * 1000; // 15 minute sliding window for tracking

// Maximum string lengths for input sanitization
const MAX_STRING_LENGTHS: Record<string, number> = {
  default: 255,
  email: 254,
  password: 128,
  name: 100,
  description: 2000,
  details: 5000,
  userAgent: 500,
};

// ==========================================
// In-Memory Rate Limiter
// ==========================================

const rateLimitStore = new Map<string, AttemptTracker>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, tracker] of rateLimitStore.entries()) {
    // Remove entries that haven't had activity in 24 hours and are not locked
    if (
      now - tracker.lastFailureAt > 24 * 60 * 60 * 1000 &&
      tracker.lockoutUntil < now
    ) {
      rateLimitStore.delete(key);
    }
  }
}

function getTracker(key: string): AttemptTracker {
  cleanupStaleEntries();

  let tracker = rateLimitStore.get(key);
  if (!tracker) {
    tracker = {
      failures: 0,
      firstFailureAt: 0,
      lastFailureAt: 0,
      lockoutUntil: 0,
      recentAttempts: [],
    };
    rateLimitStore.set(key, tracker);
  }
  return tracker;
}

/**
 * Check rate limit for a given key (email or IP).
 * Returns whether the request is allowed, remaining attempts, and lockout info.
 */
export function checkRateLimit(key: string): RateLimitResult {
  const tracker = getTracker(key);
  const now = Date.now();

  // If currently locked out
  if (tracker.lockoutUntil > now) {
    const remainingMs = tracker.lockoutUntil - now;
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    return {
      allowed: false,
      remainingAttempts: 0,
      locked: true,
      lockoutMinutes: remainingMinutes,
      reason: `Account temporarily locked for ${remainingMinutes} minutes.`,
    };
  }

  // If locked out but time has expired, reset the tracker
  if (tracker.lockoutUntil > 0 && tracker.lockoutUntil <= now) {
    tracker.failures = 0;
    tracker.firstFailureAt = 0;
    tracker.lastFailureAt = 0;
    tracker.lockoutUntil = 0;
    tracker.recentAttempts = [];
  }

  // Clean up old attempts outside the sliding window
  tracker.recentAttempts = tracker.recentAttempts.filter(
    (ts) => now - ts < WINDOW_MS
  );

  const recentCount = tracker.recentAttempts.length;

  // Determine lockout tier based on total failure count
  if (tracker.failures >= MAX_FAILURES_TIER_3) {
    // 24-hour lockout after 20+ total failures
    tracker.lockoutUntil = now + LOCKOUT_MINUTES_TIER_3 * 60 * 1000;
    return {
      allowed: false,
      remainingAttempts: 0,
      locked: true,
      lockoutMinutes: LOCKOUT_MINUTES_TIER_3,
      reason: `Too many failed attempts. Account locked for 24 hours.`,
    };
  }

  if (tracker.failures >= MAX_FAILURES_TIER_2) {
    // 2-hour lockout after 10+ total failures
    tracker.lockoutUntil = now + LOCKOUT_MINUTES_TIER_2 * 60 * 1000;
    return {
      allowed: false,
      remainingAttempts: 0,
      locked: true,
      lockoutMinutes: LOCKOUT_MINUTES_TIER_2,
      reason: `Too many failed attempts. Account locked for 2 hours.`,
    };
  }

  // Check if within the 15-min window we've hit tier 1
  if (recentCount >= MAX_FAILURES_TIER_1) {
    // 30-minute lockout
    tracker.lockoutUntil = now + LOCKOUT_MINUTES_TIER_1 * 60 * 1000;
    return {
      allowed: false,
      remainingAttempts: 0,
      locked: true,
      lockoutMinutes: LOCKOUT_MINUTES_TIER_1,
      reason: `Too many login attempts. Account temporarily locked for 30 minutes.`,
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_FAILURES_TIER_1 - recentCount,
    locked: false,
    lockoutMinutes: 0,
  };
}

/**
 * Record a failed attempt for a given key.
 * Returns the updated rate limit state.
 */
export function recordFailedAttempt(key: string): RateLimitResult {
  const tracker = getTracker(key);
  const now = Date.now();

  tracker.failures += 1;
  tracker.lastFailureAt = now;
  if (tracker.firstFailureAt === 0) {
    tracker.firstFailureAt = now;
  }
  tracker.recentAttempts.push(now);

  // Clean up old attempts outside the sliding window
  tracker.recentAttempts = tracker.recentAttempts.filter(
    (ts) => now - ts < WINDOW_MS
  );

  return checkRateLimit(key);
}

/**
 * Reset rate limit for a key (e.g., after successful login).
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get the failure count for a given key.
 */
export function getFailureCount(key: string): number {
  const tracker = rateLimitStore.get(key);
  if (!tracker) return 0;
  return tracker.failures;
}

/**
 * Get all currently locked keys (for admin dashboard).
 */
export function getLockedKeys(): Array<{
  key: string;
  failures: number;
  lockoutUntil: number;
}> {
  const now = Date.now();
  const locked: Array<{ key: string; failures: number; lockoutUntil: number }> =
    [];

  for (const [key, tracker] of rateLimitStore.entries()) {
    if (tracker.lockoutUntil > now) {
      locked.push({
        key,
        failures: tracker.failures,
        lockoutUntil: tracker.lockoutUntil,
      });
    }
  }

  return locked;
}

// ==========================================
// Security Audit Logger
// ==========================================

/**
 * Log a security event to the database.
 * This creates a SecurityAuditLog entry.
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    await db.securityAuditLog.create({
      data: {
        tenantId: event.tenantId || "platform",
        eventType: event.eventType,
        severity: event.severity || "info",
        ipAddress: event.ipAddress || "",
        userAgent: event.userAgent || "",
        email: event.email || "",
        details: event.details || "",
        metadata: event.metadata ? JSON.stringify(event.metadata) : "",
      },
    });
  } catch (error) {
    // Don't throw — logging should never break the request flow
    console.error("[Security] Failed to log security event:", error);
  }
}

// ==========================================
// Input Sanitizer
// ==========================================

/**
 * Strip HTML tags from a string.
 */
function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Trim whitespace from a string.
 */
function trimWhitespace(input: string): string {
  return input.trim();
}

/**
 * Get the max allowed length for a given field type.
 */
function getMaxLength(fieldType: string): number {
  return MAX_STRING_LENGTHS[fieldType] || MAX_STRING_LENGTHS.default;
}

/**
 * Sanitize a string input by stripping HTML, trimming whitespace, and limiting length.
 */
export function sanitizeInput(
  input: unknown,
  fieldType: string = "default"
): string {
  if (typeof input !== "string") {
    return "";
  }

  const maxLength = getMaxLength(fieldType);
  let result = input;

  // Strip HTML tags
  result = stripHtmlTags(result);

  // Trim whitespace
  result = trimWhitespace(result);

  // Limit length
  if (result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  return result;
}

/**
 * Sanitize an object's string fields recursively.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fieldTypes?: Record<string, string>
): T {
  const result = { ...obj };

  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = sanitizeInput(
        value,
        fieldTypes?.[key]
      );
    } else if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      (result as Record<string, unknown>)[key] = sanitizeObject(
        value as Record<string, unknown>,
        fieldTypes
      );
    }
  }

  return result;
}

// ==========================================
// Brute Force Detector
// ==========================================

export interface BruteForceResult {
  isBruteForce: boolean;
  failureCount: number;
  severity: SecuritySeverity;
  pattern: string | null;
}

/**
 * Detect brute force patterns for a given email or IP.
 * Checks for rapid successive failures from the same source.
 */
export function detectBruteForce(email: string, ipAddress: string): BruteForceResult {
  const emailTracker = rateLimitStore.get(email);
  const ipTracker = rateLimitStore.get(`ip:${ipAddress}`);
  const now = Date.now();

  // Check email-based brute force
  if (emailTracker) {
    // Clean old attempts
    const recentEmailAttempts = emailTracker.recentAttempts.filter(
      (ts) => now - ts < WINDOW_MS
    );

    // 10+ failures = brute force (critical)
    if (emailTracker.failures >= MAX_FAILURES_TIER_2) {
      return {
        isBruteForce: true,
        failureCount: emailTracker.failures,
        severity: "critical",
        pattern: `High failure count (${emailTracker.failures}) for email: ${email}`,
      };
    }

    // 5+ rapid failures within 5 minutes
    const fiveMinAgo = now - 5 * 60 * 1000;
    const rapidFailures = recentEmailAttempts.filter((ts) => ts > fiveMinAgo);

    if (rapidFailures.length >= 5) {
      return {
        isBruteForce: true,
        failureCount: rapidFailures.length,
        severity: "warning",
        pattern: `Rapid failures (${rapidFailures.length} in 5 min) for email: ${email}`,
      };
    }
  }

  // Check IP-based brute force (multiple different emails from same IP)
  if (ipTracker) {
    const recentIpAttempts = ipTracker.recentAttempts.filter(
      (ts) => now - WINDOW_MS
    );

    // If the same IP has generated many failures across different accounts
    if (ipTracker.failures >= 15) {
      return {
        isBruteForce: true,
        failureCount: ipTracker.failures,
        severity: "critical",
        pattern: `High failure count (${ipTracker.failures}) from IP: ${ipAddress}`,
      };
    }

    // Rapid failures from IP
    const fiveMinAgo = now - 5 * 60 * 1000;
    const rapidIpFailures = recentIpAttempts.filter((ts) => ts > fiveMinAgo);

    if (rapidIpFailures.length >= 8) {
      return {
        isBruteForce: true,
        failureCount: rapidIpFailures.length,
        severity: "warning",
        pattern: `Rapid failures (${rapidIpFailures.length} in 5 min) from IP: ${ipAddress}`,
      };
    }
  }

  return {
    isBruteForce: false,
    failureCount: emailTracker?.failures || 0,
    severity: "info",
    pattern: null,
  };
}

// ==========================================
// Request Helpers
// ==========================================

/**
 * Extract the client IP address from request headers.
 * Checks x-forwarded-for, x-real-ip, and falls back to "unknown".
 */
export function extractClientIp(request: Request): string {
  // Try x-forwarded-for (may contain comma-separated list)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  // Try x-real-ip
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

/**
 * Extract the User-Agent from request headers.
 */
export function extractUserAgent(request: Request): string {
  return request.headers.get("user-agent") || "unknown";
}

// ==========================================
// Login Security Integration Helper
// ==========================================

export interface LoginSecurityCheck {
  preCheck: () => RateLimitResult;
  onFailed: (failureReason?: string) => Promise<void>;
  onSuccess: () => Promise<void>;
}

/**
 * Create a login security check for a given email and request.
 * Returns callbacks for pre-check, failure handling, and success handling.
 */
export function createLoginSecurityCheck(
  email: string,
  request: Request,
  tenantId: string = "platform"
): LoginSecurityCheck {
  const ipAddress = extractClientIp(request);
  const userAgent = extractUserAgent(request);
  const sanitizedEmail = sanitizeInput(email, "email");
  const ipKey = `ip:${ipAddress}`;

  // Pre-check: verify not rate-limited
  function preCheck(): RateLimitResult {
    // Check both email and IP
    const emailCheck = checkRateLimit(sanitizedEmail);
    const ipCheck = checkRateLimit(ipKey);

    // If either is locked, block
    if (!emailCheck.allowed) {
      // Log rate limited event
      logSecurityEvent({
        eventType: "rate_limited",
        severity: "warning",
        tenantId,
        ipAddress,
        userAgent,
        email: sanitizedEmail,
        details: `Email rate limited: ${emailCheck.reason}`,
        metadata: {
          failures: getFailureCount(sanitizedEmail),
          lockoutMinutes: emailCheck.lockoutMinutes,
          source: "email",
        },
      });
      return emailCheck;
    }

    if (!ipCheck.allowed) {
      logSecurityEvent({
        eventType: "rate_limited",
        severity: "warning",
        tenantId,
        ipAddress,
        userAgent,
        email: sanitizedEmail,
        details: `IP rate limited: ${ipCheck.reason}`,
        metadata: {
          failures: getFailureCount(ipKey),
          lockoutMinutes: ipCheck.lockoutMinutes,
          source: "ip",
        },
      });
      return ipCheck;
    }

    return emailCheck;
  }

  // On failed login: record failure and log event
  async function onFailed(failureReason?: string): Promise<void> {
    const emailResult = recordFailedAttempt(sanitizedEmail);
    recordFailedAttempt(ipKey);

    // Determine severity based on failure count
    const totalFailures = getFailureCount(sanitizedEmail);
    let severity: SecuritySeverity = "info";
    if (totalFailures >= MAX_FAILURES_TIER_2) {
      severity = "critical";
    } else if (totalFailures >= 3) {
      severity = "warning";
    }

    // Log failed login
    await logSecurityEvent({
      eventType: "login_failed",
      severity,
      tenantId,
      ipAddress,
      userAgent,
      email: sanitizedEmail,
      details: failureReason || "Invalid credentials",
      metadata: {
        totalFailures,
        remainingAttempts: emailResult.remainingAttempts,
        locked: emailResult.locked,
      },
    });

    // Check for brute force pattern
    const bruteForceResult = detectBruteForce(sanitizedEmail, ipAddress);
    if (bruteForceResult.isBruteForce) {
      await logSecurityEvent({
        eventType: "brute_force_detected",
        severity: bruteForceResult.severity,
        tenantId,
        ipAddress,
        userAgent,
        email: sanitizedEmail,
        details: bruteForceResult.pattern || "Brute force pattern detected",
        metadata: {
          failureCount: bruteForceResult.failureCount,
          pattern: bruteForceResult.pattern,
        },
      });

      // If critical, also log account_locked event
      if (bruteForceResult.severity === "critical") {
        await logSecurityEvent({
          eventType: "account_locked",
          severity: "critical",
          tenantId,
          ipAddress,
          userAgent,
          email: sanitizedEmail,
          details: "Account locked due to excessive failed login attempts",
          metadata: {
            failureCount: totalFailures,
            lockoutMinutes: emailResult.lockoutMinutes,
          },
        });
      }
    }

    // If locked out, log rate_limited event
    if (emailResult.locked) {
      await logSecurityEvent({
        eventType: "rate_limited",
        severity: "warning",
        tenantId,
        ipAddress,
        userAgent,
        email: sanitizedEmail,
        details: `Account locked for ${emailResult.lockoutMinutes} minutes after ${totalFailures} failures`,
        metadata: {
          totalFailures,
          lockoutMinutes: emailResult.lockoutMinutes,
        },
      });
    }
  }

  // On successful login: check if there were prior failures
  async function onSuccess(): Promise<void> {
    const priorFailures = getFailureCount(sanitizedEmail);

    // Log successful login
    await logSecurityEvent({
      eventType: "login_success",
      severity: "info",
      tenantId,
      ipAddress,
      userAgent,
      email: sanitizedEmail,
      details: priorFailures > 0
        ? `Successful login after ${priorFailures} prior failures`
        : "Successful login",
      metadata: {
        priorFailures,
      },
    });

    // If there were prior failures, log the suspicious success
    if (priorFailures > 0) {
      await logSecurityEvent({
        eventType: "login_success_after_failures",
        severity: priorFailures >= 5 ? "critical" : "warning",
        tenantId,
        ipAddress,
        userAgent,
        email: sanitizedEmail,
        details: `Login succeeded after ${priorFailures} failed attempts`,
        metadata: {
          priorFailures,
          userAgent,
        },
      });

      // Reset rate limit counters on success
      resetRateLimit(sanitizedEmail);
    }
  }

  return { preCheck, onFailed, onSuccess };
}
