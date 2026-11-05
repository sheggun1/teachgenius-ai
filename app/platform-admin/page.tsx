import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/app/components/logout-button";
import PlatformManagement from "@/app/platform-admin/platform-management";

const panel = {
  background: "#fff",
  border: "1px solid #e5eaf2",
  borderRadius: 14,
  padding: 20,
};

const label = { color: "#64748b", fontSize: 12, fontWeight: 700 as const, letterSpacing: "0.04em" };

export default async function PlatformAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.platformRole !== "PLATFORM_ADMIN") redirect("/");

  const [userCount, schoolCount, workspaceCount, teacherMembershipCount, curriculumCount, documentCount, users, organizations] =
    await Promise.all([
      prisma.userProfile.count(),
      prisma.organization.count({ where: { type: "SCHOOL" } }),
      prisma.organization.count(),
      prisma.membership.count({ where: { role: "TEACHER", status: "ACTIVE" } }),
      prisma.curriculumDocument.count(),
      prisma.generatedDocument.count(),
      prisma.userProfile.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          displayName: true,
          email: true,
          platformRole: true,
          createdAt: true,
          memberships: {
            where: { status: "ACTIVE" },
            select: { role: true, organization: { select: { name: true } } },
            take: 2,
          },
        },
      }),
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          type: true,
          createdAt: true,
          _count: { select: { memberships: true, curricula: true, documents: true } },
        },
      }),
    ]);

  const stats = [
    { title: "Registered users", value: userCount, note: "All platform accounts" },
    { title: "Schools", value: schoolCount, note: "Registered school workspaces" },
    { title: "Total workspaces", value: workspaceCount, note: "Schools and education organisations" },
    { title: "Active teachers", value: teacherMembershipCount, note: "Active teacher memberships" },
    { title: "Curriculum documents", value: curriculumCount, note: "Across all workspaces" },
    { title: "Teaching documents", value: documentCount, note: "Generated and saved documents" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", color: "#172033" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e5eaf2" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ color: "#3157c8", fontWeight: 800, fontSize: 20 }}>TeachGenius AI</div>
            <div style={{ color: "#718096", fontSize: 12, marginTop: 3 }}>Platform administration</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" as const }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{user.displayName || "Platform Admin"}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{user.email}</div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "34px 24px 60px" }}>
        <PlatformManagement />
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 18, marginBottom: 26 }}>
          <div>
            <p style={{ ...label, margin: "0 0 8px" }}>PLATFORM OVERVIEW</p>
            <h1 style={{ fontSize: 30, margin: 0, letterSpacing: "-0.7px" }}>Administration dashboard</h1>
            <p style={{ color: "#64748b", margin: "9px 0 0", lineHeight: 1.6 }}>Monitor users, school workspaces, curriculum and teaching activity across TeachGenius AI.</p>
          </div>
          <div style={{ ...panel, padding: "12px 16px", minWidth: 190 }}>
            <div style={label}>ADMIN ACCESS</div>
            <div style={{ color: "#166534", fontWeight: 750, marginTop: 6 }}>Platform administrator</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>Authenticated session</div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: 14, marginBottom: 26 }}>
          {stats.map((stat) => (
            <article key={stat.title} style={panel}>
              <div style={{ color: "#64748b", fontSize: 13 }}>{stat.title}</div>
              <div style={{ fontSize: 30, fontWeight: 800, marginTop: 7 }}>{stat.value.toLocaleString()}</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{stat.note}</div>
            </article>
          ))}
        </section>

        <section style={{ ...panel, marginBottom: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 750 }}>Administration modules</div>
          <p style={{ color: "#64748b", fontSize: 13, margin: "6px 0 15px", lineHeight: 1.6 }}>This first release is a read-only overview. Account changes, school management and billing controls will be added as separately secured features.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
            {[
              ["User management", "Review registered accounts and platform roles", "Available"],
              ["School workspaces", "Review schools and membership totals", "Available"],
              ["Curriculum oversight", "Monitor curriculum documents across schools", "Overview only"],
              ["Billing and usage", "Credits, subscriptions and payment records", "Coming next"],
            ].map(([title, description, status]) => (
              <div key={title} style={{ border: "1px solid #e5eaf2", borderRadius: 11, padding: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{title}</strong>
                  <span style={{ color: "#475569", background: "#f1f5f9", borderRadius: 20, padding: "4px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{status}</span>
                </div>
                <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5, margin: "9px 0 0" }}>{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
          <div style={panel}>
            <h2 style={{ fontSize: 18, margin: "0 0 14px" }}>Recently registered users</h2>
            {users.length === 0 ? <p style={{ color: "#64748b", fontSize: 13 }}>No user accounts found.</p> : (
              <div>
                {users.map((item) => (
                  <div key={item.id} style={{ padding: "12px 0", borderTop: "1px solid #edf0f5" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong style={{ fontSize: 13 }}>{item.displayName || "Unnamed user"}</strong>
                      <span style={{ color: item.platformRole === "PLATFORM_ADMIN" ? "#166534" : "#475569", fontSize: 11, fontWeight: 700 }}>{item.platformRole === "PLATFORM_ADMIN" ? "PLATFORM ADMIN" : "USER"}</span>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{item.email || "No email"}</div>
                    <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>
                      {item.memberships.map((membership) => `${membership.role.replaceAll("_", " ")} · ${membership.organization.name}`).join(" | ") || "No active workspace"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={panel}>
            <h2 style={{ fontSize: 18, margin: "0 0 14px" }}>School workspaces</h2>
            {organizations.length === 0 ? <p style={{ color: "#64748b", fontSize: 13 }}>No workspaces found.</p> : (
              <div>
                {organizations.map((organization) => (
                  <div key={organization.id} style={{ padding: "12px 0", borderTop: "1px solid #edf0f5" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong style={{ fontSize: 13 }}>{organization.name}</strong>
                      <span style={{ color: "#64748b", fontSize: 10, fontWeight: 700 }}>{organization.type.replaceAll("_", " ")}</span>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 5 }}>
                      {organization._count.memberships} members · {organization._count.curricula} curriculum · {organization._count.documents} documents
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: "#94a3b8", fontSize: 12, marginTop: 28 }}>
          <span>TeachGenius AI · Platform administration</span>
          <Link href="/api/health" style={{ color: "#64748b" }}>System status</Link>
        </footer>
      </div>
    </main>
  );
}
