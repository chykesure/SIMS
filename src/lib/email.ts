export function buildPasswordResetEmail({
  schoolName,
  userName,
  resetCode,
}: {
  schoolName: string;
  userName: string;
  resetCode: string;
}): string {
  return `
    <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">SchoolDesk</h1>
        <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">${schoolName}</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#1e293b;margin:0 0 8px;">Password Reset Request</h2>
        <p style="color:#475569;line-height:1.7;font-size:15px;">
          Hi <strong>${userName}</strong>, we received a request to reset your password on <strong>${schoolName}</strong>.
        </p>
        <div style="background:#f0f9ff;border:2px dashed #3b82f6;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
          <p style="color:#64748b;font-size:13px;margin:0 0 8px;">Your password reset code is:</p>
          <p style="color:#1e40af;font-size:36px;font-weight:bold;letter-spacing:8px;margin:0;font-family:monospace;">${resetCode}</p>
        </div>
        <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;margin:24px 0;border-radius:0 8px 8px 0;">
          <p style="margin:0;color:#92400e;font-size:14px;">
            <strong>This code expires in 15 minutes.</strong> If you did not request this reset, 
            please ignore this email — your password will remain unchanged.
          </p>
        </div>
        <p style="color:#475569;line-height:1.7;font-size:15px;">
          If you're having trouble, contact your school administrator for assistance.
        </p>
        <div style="text-align:center;margin:32px 0 0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} SchoolDesk. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;
}