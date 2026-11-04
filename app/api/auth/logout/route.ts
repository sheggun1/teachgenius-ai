import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true, message: "Signed out" });
  } catch (error) {
    console.error("Logout failed:", error);
    return NextResponse.json({ error: "Unable to sign out" }, { status: 500 });
  }
}
