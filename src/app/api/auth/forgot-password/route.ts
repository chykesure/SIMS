// src/app/api/auth/forgot-password/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: "chyketech@gmail.com",
    pass: process.env.GMAIL_APP_PASS,
  },
});

// POST /api/auth/forgot-password — Send 6-digit reset code to email
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // SQLite doesn't support case-insensitive search, so fetch all and filter in JS
    const allUsers = await db.user.findMany({
      include: { tenant: { select: { name: true } } },
    });

    // Search by recoveryEmail first (case-insensitive), then fallback to login email
    let user = allUsers.find(
      (u) => u.recoveryEmail && u.recoveryEmail.toLowerCase() === trimmedEmail
    );

    if (!user) {
      user = allUsers.find(
        (u) => u.email.toLowerCase() === trimmedEmail
      );
    }

    if (!user) {
      return NextResponse.json({
        success: true,
        found: false,
        message: "No account found with that email. Please check and try again.",
      });
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store code on user
    await db.user.update({
      where: { id: user.id },
      data: { resetCode, resetCodeExpiry },
    });

    // Send email directly
    const schoolName = user.tenant?.name || "Chyksys";
    const emailHtml = `
    <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">Chyksys</h1>
        <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">${schoolName}</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#1e293b;margin:0 0 8px;">Password Reset Request</h2>
        <p style="color:#475569;line-height:1.7;font-size:15px;">
          Hi <strong>${user.username}</strong>, we received a request to reset your password on <strong>${schoolName}</strong>.
        </p>
        <div style="background:#f0f9ff;border:2px dashed #3b82f6;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
          <p style="color:#64748b;font-size:13px;margin:0 0 8px;">Your password reset code is:</p>
          <p style="color:#1e40af;font-size:36px;font-weight:bold;letter-spacing:8px;margin:0;font-family:monospace;">${resetCode}</p>
        </div>
        <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;margin:24px 0;border-radius:0 8px 8px 0;">
          <p style="margin:0;color:#92400e;font-size:14px;">
            <strong>This code expires in 15 minutes.</strong> If you did not request this reset, please ignore this email.
          </p>
        </div>
        <p style="color:#475569;line-height:1.7;font-size:15px;">
          If you're having trouble, contact your school administrator for assistance.
        </p>
        <div style="text-align:center;margin:32px 0 0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} SchoolDesk. All rights reserved.</p>
        </div>
      </div>
    </div>`;

    // Send email in background (don't block the response)
    transporter.sendMail({
      from: `"Chyksys" <chyketech@gmail.com>`,
      to: user.recoveryEmail || user.email,
      subject: `Password Reset Code — ${schoolName}`,
      html: emailHtml,
    }).catch((err) => {
      console.error("[ForgotPassword] Email send failed:", err);
    });

    return NextResponse.json({
      success: true,
      found: true,
      message: "Reset code sent to your email.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: `Failed to send reset code: ${message}` },
      { status: 500 }
    );
  }
}