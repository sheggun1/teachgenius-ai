import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ResourcesClient from "./resources-client";

export default async function ResourcesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const platformAdmin = user.platformRole === "PLATFORM_ADMIN";
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE", role: { in: ["SCHOOL_ADMIN", "TEACHER"] } },
    include: { organization: { select: { id: true, name: true, type: true } } },
    orderBy: { createdAt: "asc" },
  });
  const workspaces = platformAdmin
    ? await prisma.organization.findMany({ select: { id: true, name: true, type: true }, orderBy: { name: "asc" } })
    : memberships.map((m) => ({ ...m.organization, role: m.role }));
  if (!platformAdmin && workspaces.length === 0) redirect("/");
  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", color: "#172033" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e5eaf2" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div><strong style={{ color: "#174ea6", fontSize: 19 }}>TeachGenius AI</strong><div style={{ color: "#64748b", fontSize: 12 }}>Resource & curriculum management</div></div>
          <Link href={platformAdmin ? "/platform-admin" : "/"} style={{ color: "#174ea6", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>← Back to dashboard</Link>
        </div>
      </header>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px 60px" }}>
        <div style={{ marginBottom: 24 }}><div style={{ color: "#3157c8", fontWeight: 800, fontSize: 11, letterSpacing: ".08em" }}>TEACHING RESOURCE CENTRE</div><h1 style={{ fontSize: 30, margin: "8px 0" }}>Resource Library</h1><p style={{ color: "#64748b", margin: 0, lineHeight: 1.6 }}>Upload, organise, review and securely share curriculum and teaching materials. Approved text-based resources can also guide AI document generation.</p></div>
        <ResourcesClient workspaces={workspaces} isPlatformAdmin={platformAdmin} userId={user.id} />
      </div>
    </main>
  );
}
