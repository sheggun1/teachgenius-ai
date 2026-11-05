import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import StudioClient from "./studio-client";

export default async function StudioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <StudioClient displayName={user.displayName || user.email || "Teacher"} />;
}
