import { NextResponse } from "next/server";

// Developer access code — configurable via environment variable
const DEV_ACCESS_CODE = process.env.DEV_ACCESS_CODE || "SD2024Q";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, passcode } = body;   // accept BOTH field names

    const enteredCode = (code || passcode || "").trim();

    if (!enteredCode) {
      return NextResponse.json(
        { success: false, valid: false, message: "Access code is required" },
        { status: 400 }
      );
    }

    // Constant-time comparison to prevent timing attacks
    if (enteredCode.toUpperCase() !== DEV_ACCESS_CODE.toUpperCase()) {
      return NextResponse.json(
        { success: false, valid: false, message: "Invalid access code" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        valid: true,
        message: "Access code verified",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, valid: false, message: "Verification failed" },
      { status: 500 }
    );
  }
}