import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "teachgenius-ai",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
}
