import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/app/components/logout-button";

const tools = [
  {
    title: "AI Lesson Studio",
    description: "Prepare structured lesson notes and lesson plans from approved curriculum topics.",
    label: "Coming next",
  },
  {
    title: "AI Examination Studio",
    description: "Build tests, quizzes and examination papers aligned with the approved scheme of work.",
    label: "Coming next",
  },
  {
    title: "Question Bank",
    description: "Organise and reuse questions for classroom assessments.",
    label: "Coming next",
  },
  {
    title: "Curriculum & Scheme of Work",
    description: "View the school-approved topics that guide every AI-generated learning resource.",
    label: "Curriculum setup",
  },
  {
    title: "Document Studio",
    description: "Review, edit and prepare teaching documents for PDF or Word export.",
    label: "Coming next",
  },
  {
    title: "Student Learning Portal",
    description: "A place for students to access assigned learning materials and assessments.",
    label: "Coming next",
  },
];

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5eaf2",
  borderRadius: 14,
  padding: 20,
};

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  const membership = memberships[0] ?? null;
  const workspace = membership?.organization ?? null;
  const documentWhere = workspace
    ? { OR: [{ ownerUserId: user.id }, { organizationId: workspace.id }] }
    : { ownerUserId: user.id };

  const [documentCount, recentDocuments, publishedCurriculumCount] = await Promise.all([
    prisma.generatedDocument.count({ where: documentWhere }),
    prisma.generatedDocument.findMany({
      where: documentWhere,
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, status: true, updatedAt: true },
    }),
    workspace
      ? prisma.curriculumDocument.count({
          where: { organizationId: workspace.id, status: "PUBLISHED" },
        })
      : Promise.resolve(0),
  ]);

  const displayName = user.displayName?.trim() || user.email || "Teacher";
  const roleLabel =
    user.platformRole === "PLATFORM_ADMIN"
      ? "Platform Admin"
      : membership?.role === "SCHOOL_ADMIN"
        ? "School Admin"
        : membership?.role === "STUDENT"
          ? "Student"
          : "Teacher";

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", color: "#172033" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e5eaf2" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ color: "#3157c8", fontWeight: 800, fontSize: 20 }}>TeachGenius AI</div>
            <div style={{ color: "#718096", fontSize: 12, marginTop: 3 }}>Teaching and learning workspace</div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 24px 60px" }}>
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 26 }}>
          <div>
            <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 8px" }}>YOUR DASHBOARD</p>
            <h1 style={{ fontSize: 30, margin: 0, letterSpacing: "-0.7px" }}>Welcome, {displayName}</h1>
            <p style={{ color: "#64748b", margin: "9px 0 0" }}>Your teaching workspace is ready.</p>
          </div>
          <div style={{ ...cardStyle, minWidth: 230, padding: "14px 18px" }}>
            <div style={{ color: "#64748b", fontSize: 12, marginBottom: 5 }}>SIGNED IN AS</div>
            <div style={{ fontWeight: 700 }}>{roleLabel}</div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{user.email}</div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 28 }}>
          <div style={cardStyle}>
            <div style={{ color: "#64748b", fontSize: 13 }}>Current workspace</div>
            <div style={{ fontSize: 19, fontWeight: 750, marginTop: 8 }}>{workspace?.name ?? "No active workspace"}</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>{workspace?.type === "SCHOOL" ? "School workspace" : workspace ? "Personal teacher workspace" : "Contact an administrator for access"}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#64748b", fontSize: 13 }}>Teaching documents</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 5 }}>{documentCount}</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Saved in your workspace</div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: "#64748b", fontSize: 13 }}>Approved curriculum items</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 5 }}>{publishedCurriculumCount}</div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Available to guide AI content</div>
          </div>
        </section>

        <section style={{ ...cardStyle, marginBottom: 28, background: "#eef4ff", borderColor: "#d9e5ff" }}>
          <div style={{ fontWeight: 750, marginBottom: 6 }}>Curriculum-first content generation</div>
          <p style={{ color: "#475569", margin: 0, lineHeight: 1.6, fontSize: 14 }}>
            TeachGenius AI is being built to follow the scheme of work uploaded and approved by the school administrator.
            AI learning materials must use approved curriculum topics rather than inventing topics outside the school plan.
          </p>
          {publishedCurriculumCount === 0 && (
            <p style={{ color: "#8a5a12", fontSize: 13, margin: "10px 0 0" }}>
              No published curriculum is connected to this workspace yet. Curriculum setup is required before curriculum-based AI generation can be enabled.
            </p>
          )}
        </section>

        <section style={{ marginBottom: 30 }}>
          <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 21, margin: 0 }}>Teaching tools</h2>
              <p style={{ color: "#64748b", fontSize: 13, margin: "5px 0 0" }}>Your workspace for planning, assessment and learning resources.</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            {tools.map((tool) => (
              <article key={tool.title} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <h3 style={{ fontSize: 16, margin: 0 }}>{tool.title}</h3>
                  <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 20, padding: "4px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{tool.label}</span>
                </div>
                <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.55, margin: "12px 0 0" }}>{tool.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={{ fontSize: 19, margin: "0 0 14px" }}>Recently updated documents</h2>
          {recentDocuments.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 14, padding: "12px 0" }}>
              You have not saved any teaching documents yet. Your documents will appear here when document creation is added.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 0 }}>
              {recentDocuments.map((document) => (
                <div key={document.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "12px 0", borderTop: "1px solid #edf0f5" }}>
                  <div>
                    <div style={{ fontWeight: 650, fontSize: 14 }}>{document.title}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{document.type.replaceAll("_", " ")} · {document.status}</div>
                  </div>
                  <time style={{ color: "#64748b", fontSize: 12, whiteSpace: "nowrap" }}>{document.updatedAt.toLocaleDateString()}</time>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: "#94a3b8", fontSize: 12, marginTop: 28 }}>
          <span>TeachGenius AI · Your teaching workspace</span>
          <Link href="/api/health" style={{ color: "#64748b" }}>System status</Link>
        </footer>
      </div>
    </main>
  );
}
