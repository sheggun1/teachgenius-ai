import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        platformRole: user.platformRole,
      },
    });
  } catch (error) {
    console.error("Auth session lookup failed:", error);
    return NextResponse.json({ error: "Unable to verify session" }, { status: 500 });
  }
}
