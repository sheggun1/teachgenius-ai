import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bootstrapSchema = z.object({
  email: z.string().trim().email().max(254),
  secret: z.string().min(32).max(512),
});

function matchesSecret(provided: string, expected: string) {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

/**
 * One-time bootstrap for the first platform administrator.
 * Requires PLATFORM_ADMIN_BOOTSTRAP_SECRET and an existing registered account.
 * The route permanently closes itself after the first platform admin is created.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.PLATFORM_ADMIN_BOOTSTRAP_SECRET;
  if (!expectedSecret || expectedSecret.length < 32) {
    return NextResponse.json(
      { error: "Platform admin bootstrap is not configured" },
      { status: 503 },
    );
  }

  try {
    const parsed = bootstrapSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Provide a valid email and bootstrap secret" },
        { status: 400 },
      );
    }

    if (!matchesSecret(parsed.data.secret, expectedSecret)) {
      return NextResponse.json({ error: "Invalid bootstrap credentials" }, { status: 401 });
    }

    const email = parsed.data.email.toLowerCase();

    const result = await prisma.$transaction(async (tx) => {
      const existingAdmin = await tx.userProfile.findFirst({
        where: { platformRole: "PLATFORM_ADMIN" },
        select: { id: true },
      });

      if (existingAdmin) return { status: "already_initialized" as const };

      const user = await tx.userProfile.findUnique({
        where: { email },
        select: { id: true },
      });

      if (!user) return { status: "user_not_found" as const };

      const promoted = await tx.userProfile.updateMany({
        where: { id: user.id, platformRole: "USER" },
        data: { platformRole: "PLATFORM_ADMIN" },
      });

      if (promoted.count !== 1) return { status: "already_initialized" as const };
      return { status: "created" as const };
    }, { isolationLevel: "Serializable" });

    if (result.status === "already_initialized") {
      return NextResponse.json(
        { error: "Platform admin setup has already been completed" },
        { status: 409 },
      );
    }

    if (result.status === "user_not_found") {
      return NextResponse.json(
        { error: "No account exists with that email. Register the account first." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "The first platform administrator has been created. Sign in again to refresh your session.",
    });
  } catch (error) {
    console.error("Platform admin bootstrap failed:", error);
    return NextResponse.json(
      { error: "Platform admin setup could not be completed" },
      { status: 500 },
    );
  }
}
