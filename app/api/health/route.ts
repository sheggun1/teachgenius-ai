import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      success: true,
      service: "teachgenius-ai",
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check database probe failed:", error);
    return NextResponse.json({
      success: false,
      service: "teachgenius-ai",
      status: "degraded",
      database: "unavailable",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
