import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

const registrationSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  workspaceType: z.enum(["PERSONAL_TEACHER", "SCHOOL"]),
  workspaceName: z.string().trim().min(2).max(120),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = registrationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check your registration details", details: parsed.error.flatten() }, { status: 400 });
    }

    const input = parsed.data;
    const email = input.email.toLowerCase();
    const existing = await prisma.userProfile.findUnique({ where: { email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

    const passwordHash = await hashPassword(input.password);
    const slugBase = input.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "workspace";
    const slug = `${slugBase}-${randomUUID().slice(0, 8)}`;
    const role = input.workspaceType === "SCHOOL" ? "SCHOOL_ADMIN" : "TEACHER";
    const organizationType = input.workspaceType === "SCHOOL" ? "SCHOOL" : "EDUCATION_ORGANIZATION";

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.userProfile.create({
        data: { displayName: input.displayName, email, passwordHash },
      });
      const organization = await tx.organization.create({
        data: {
          name: input.workspaceName,
          slug,
          type: organizationType,
          memberships: {
            create: { userId: createdUser.id, role, status: "ACTIVE" },
          },
        },
      });
      await tx.aiCreditAccount.create({
        data: { organizationId: organization.id, balance: 100 },
      });
      await tx.aiUsageLedger.create({
        data: { organizationId: organization.id, ownerUserId: createdUser.id, operation: "STARTER_GRANT", creditsDelta: 100, status: "COMPLETED", idempotencyKey: `starter-${organization.id}`, metadata: { reason: "Initial workspace allowance" } },
      });
      return createdUser;
    });

    await createSession(user.id);
    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
      message: "Account and workspace created",
    }, { status: 201 });
  } catch (error) {
    console.error("Registration failed:", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account or workspace with these details already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Registration could not be completed" }, { status: 500 });
  }
}
