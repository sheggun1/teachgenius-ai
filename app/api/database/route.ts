
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      success: true,
      service: "teachgenius-ai",
      database: "connected",
      provider: "PostgreSQL",
      message: "Neon database connection successful",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        success: false,
        service: "teachgenius-ai",
        database: "disconnected",
        message: "Database connection failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
