// src/lib/email.ts

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "chyksys.com",
  port: 465,
  secure: true,
  auth: {
    user: "info@chyksys.com",
    pass: process.env.SMTP_EMAIL_PASS,
  },
});

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface RegistrationEmailParams {
  schoolName: string;
  adminName: string;
  adminEmail: string;
  plan: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"SchoolDesk" <info@chyksys.com>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export function buildRegistrationEmail({
  schoolName,
  adminName,
  adminEmail,
  plan,
}: RegistrationEmailParams): string {
  return `
    <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">SchoolDesk</h1>
        <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">School Intelligence Management System</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#1e293b;margin:0 0 16px;">Welcome, ${schoolName}!</h2>
        <p style="color:#475569;line-height:1.7;font-size:15px;">
          Thank you for registering with SchoolDesk. Your school has been successfully signed up on the 
          <strong>${plan}</strong> plan by <strong>${adminName}</strong> (${adminEmail}).
        </p>
        <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;margin:24px 0;border-radius:0 8px 8px 0;">
          <p style="margin:0;color:#92400e;font-size:14px;">
            <strong>Pending Payment Approval:</strong> Your registration is currently pending. 
            Our Cloud Engineer needs to verify and approve your payment for the <strong>Security &amp; Cloud Storage</strong> term 
            before your account is fully activated.
          </p>
        </div>
        <p style="color:#475569;line-height:1.7;font-size:15px;">
          You will receive a follow-up email once your payment has been verified and your account is activated. 
          If you have any questions, feel free to reach out to our support team.
        </p>
        <div style="text-align:center;margin:32px 0 0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} SchoolDesk. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;
}