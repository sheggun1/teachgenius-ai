import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.userProfile.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 });
    }

    if (user.accountStatus !== "ACTIVE") {
      return NextResponse.json({ error: "This account has been suspended. Contact TeachGenius AI support or your platform administrator." }, { status: 403 });
    }

    await createSession(user.id);
    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, displayName: user.displayName, platformRole: user.platformRole },
    });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Unable to sign in" }, { status: 500 });
  }
}
