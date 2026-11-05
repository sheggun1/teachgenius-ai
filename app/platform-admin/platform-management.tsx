"use client";

import { useEffect, useMemo, useState } from "react";

type User = { id: string; displayName: string | null; email: string | null; platformRole: string; accountStatus: "ACTIVE" | "SUSPENDED"; createdAt: string; memberships: { id: string; role: string; status: "ACTIVE" | "INVITED" | "SUSPENDED"; organization: { id: string; name: string; type: string } }[] };
type Workspace = { id: string; name: string; slug: string; type: string; createdAt: string; _count: { memberships: number; curricula: number; documents: number }; memberships: { id: string; userId: string; role: string; status: string; user: { displayName: string | null; email: string | null } }[] };
type Audit = { id: string; action: string; targetUserId: string | null; organizationId: string | null; details: unknown; createdAt: string };
type CreditAccount = { organizationId: string; balance: number; updatedAt: string };
type AiUsage = { organizationId: string | null; operation: string; creditsDelta: number; status: string; createdAt: string };

const buttonStyle: React.CSSProperties = { border: "1px solid #dbe3ef", background: "#fff", color: "#1e3a5f", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const fieldStyle: React.CSSProperties = { width: "100%", border: "1px solid #dbe3ef", borderRadius: 8, padding: "10px 11px", fontSize: 13, background: "#fff", color: "#172033" };

export default function PlatformManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [creditAccounts, setCreditAccounts] = useState<CreditAccount[]>([]);
  const [aiUsage, setAiUsage] = useState<AiUsage[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceType, setWorkspaceType] = useState<"SCHOOL" | "EDUCATION_ORGANIZATION">("SCHOOL");
  const [adminUserId, setAdminUserId] = useState("");

  async function load() {
    const response = await fetch("/api/platform-admin/management", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load management data");
    setUsers(data.users || []); setWorkspaces(data.organizations || []); setAudit(data.auditLogs || []);
    setCreditAccounts(data.creditAccounts || []); setAiUsage(data.recentAiUsage || []);
  }
  useEffect(() => { load().catch(e => setNotice(e.message)); }, []);

  async function act(payload: Record<string, string | number>) {
    const key = payload.userId || payload.membershipId || payload.action || "workspace";
    setBusy(key); setNotice("");
    try {
      const response = await fetch("/api/platform-admin/management", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action failed");
      setNotice(data.message || "Workspace created successfully");
      await load();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Action failed"); }
    finally { setBusy(""); }
  }

  const filtered = useMemo(() => users.filter(u => [u.displayName, u.email, ...u.memberships.map(m => m.organization.name)].join(" ").toLowerCase().includes(query.toLowerCase())), [users, query]);
  const activeCount = users.filter(u => u.accountStatus === "ACTIVE").length;
  const suspendedCount = users.filter(u => u.accountStatus === "SUSPENDED").length;

  return <section style={{ display: "grid", gap: 18, marginBottom: 24 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
      {[["Active accounts", activeCount], ["Suspended accounts", suspendedCount], ["Total workspaces", workspaces.length]].map(([label, value]) => <div key={label} style={{ background: "#fff", border: "1px solid #e5eaf2", borderRadius: 12, padding: 16 }}><div style={{ color: "#64748b", fontSize: 12 }}>{label}</div><div style={{ fontSize: 26, fontWeight: 800, marginTop: 5 }}>{value}</div></div>)}
    </div>
    {notice && <div role="status" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: 12, borderRadius: 9, fontSize: 13 }}>{notice}</div>}
    <div style={{ background: "#fff", border: "1px solid #e5eaf2", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><h2 style={{ margin: 0, fontSize: 18 }}>User management</h2><p style={{ color: "#64748b", fontSize: 12, margin: "5px 0 0" }}>Platform suspension blocks the whole account. Workspace suspension only removes one membership.</p></div><input aria-label="Search users" placeholder="Search name, email or workspace" value={query} onChange={e => setQuery(e.target.value)} style={{ ...fieldStyle, maxWidth: 320 }} /></div>
      <div style={{ overflowX: "auto", marginTop: 14 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720, fontSize: 12 }}><thead><tr style={{ textAlign: "left", color: "#64748b" }}>{["User","Platform role","Account","Workspace memberships","Action"].map(x => <th key={x} style={{ padding: 10, borderBottom: "1px solid #e5eaf2" }}>{x}</th>)}</tr></thead><tbody>{filtered.map(u => <tr key={u.id}><td style={{ padding: 10, borderBottom: "1px solid #edf0f5" }}><strong>{u.displayName || "Unnamed user"}</strong><div style={{ color: "#64748b" }}>{u.email}</div></td><td style={{ padding: 10, borderBottom: "1px solid #edf0f5" }}>{u.platformRole.replaceAll("_"," ")}</td><td style={{ padding: 10, borderBottom: "1px solid #edf0f5" }}><span style={{ color: u.accountStatus === "ACTIVE" ? "#166534" : "#b91c1c", fontWeight: 800 }}>{u.accountStatus}</span></td><td style={{ padding: 10, borderBottom: "1px solid #edf0f5" }}>{u.memberships.length ? u.memberships.map(m => <div key={m.id} style={{ marginBottom: 7 }}><div>{m.organization.name} · {m.role.replaceAll("_"," ")}</div><div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}><span style={{ color: m.status === "ACTIVE" ? "#166534" : "#b45309" }}>{m.status}</span><button disabled={!!busy || u.accountStatus === "SUSPENDED"} style={buttonStyle} onClick={() => act({ action: m.status === "SUSPENDED" ? "REACTIVATE_MEMBERSHIP" : "SUSPEND_MEMBERSHIP", membershipId: m.id })}>{m.status === "SUSPENDED" ? "Restore workspace" : "Suspend workspace"}</button></div></div>) : <span style={{ color: "#94a3b8" }}>No workspace</span>}</td><td style={{ padding: 10, borderBottom: "1px solid #edf0f5" }}><button disabled={!!busy || (u.platformRole === "PLATFORM_ADMIN" && u.accountStatus === "ACTIVE")} style={buttonStyle} onClick={() => act({ action: u.accountStatus === "SUSPENDED" ? "REACTIVATE_USER" : "SUSPEND_USER", userId: u.id })}>{busy === u.id ? "Working…" : u.accountStatus === "SUSPENDED" ? "Reactivate account" : "Suspend account"}</button></td></tr>)}</tbody></table>{filtered.length === 0 && <p style={{ color: "#64748b", padding: 12 }}>No matching users.</p>}</div>
    </div>
    <div style={{ background: "#fff", border: "1px solid #e5eaf2", borderRadius: 14, padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Create a workspace</h2><p style={{ color: "#64748b", fontSize: 12 }}>Create a school or education workspace and optionally assign an existing active user as its School Admin.</p>
      <form onSubmit={e => { e.preventDefault(); act({ action: "CREATE_WORKSPACE", name: workspaceName, type: workspaceType, ...(adminUserId ? { adminUserId } : {}) }); setWorkspaceName(""); }} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, alignItems: "end" }}>
        <label style={{ fontSize: 12, color: "#475569" }}>Workspace name<input required minLength={2} maxLength={120} value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }} /></label>
        <label style={{ fontSize: 12, color: "#475569" }}>Workspace type<select value={workspaceType} onChange={e => setWorkspaceType(e.target.value as typeof workspaceType)} style={{ ...fieldStyle, marginTop: 5 }}><option value="SCHOOL">School</option><option value="EDUCATION_ORGANIZATION">Education organisation</option></select></label>
        <label style={{ fontSize: 12, color: "#475569" }}>Initial School Admin<select value={adminUserId} onChange={e => setAdminUserId(e.target.value)} style={{ ...fieldStyle, marginTop: 5 }}><option value="">Create without assigning</option>{users.filter(u => u.accountStatus === "ACTIVE").map(u => <option key={u.id} value={u.id}>{u.displayName || u.email}</option>)}</select></label>
        <button disabled={!!busy || !workspaceName.trim()} style={{ ...buttonStyle, padding: 11 }}>Create workspace</button>
      </form>
      <div style={{ display: "grid", gap: 9, marginTop: 16 }}>{workspaces.map(w => <div key={w.id} style={{ padding: 12, border: "1px solid #edf0f5", borderRadius: 9, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}><div><strong>{w.name}</strong><div style={{ color: "#64748b", fontSize: 12 }}>{w.type.replaceAll("_"," ")} · {w._count.memberships} memberships · {w._count.curricula} curriculum items</div><div style={{ color: "#155eef", fontSize: 12, fontWeight: 800, marginTop: 5 }}>AI credits: {creditAccounts.find(a => a.organizationId === w.id)?.balance ?? 0}</div></div><div style={{ display: "grid", justifyItems: "end", gap: 7 }}><span style={{ color: "#64748b", fontSize: 12 }}>{w.slug}</span><button disabled={!!busy} style={buttonStyle} onClick={() => act({ action: "GRANT_AI_CREDITS", organizationId: w.id, credits: 100, reason: "Platform administrator top-up" })}>Grant 100 credits</button></div></div>)}</div>
    </div>
    <div style={{ background: "#fff", border: "1px solid #e5eaf2", borderRadius: 14, padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Recent AI credit activity</h2>
      <div style={{ marginTop: 10 }}>{aiUsage.length ? aiUsage.map((item, i) => <div key={i} style={{ padding: "8px 0", borderTop: "1px solid #edf0f5", fontSize: 12, display: "flex", justifyContent: "space-between", gap: 10 }}><span>{workspaces.find(w => w.id === item.organizationId)?.name || "Workspace"} · {item.operation.replaceAll("_"," ")}</span><strong>{item.creditsDelta > 0 ? "+" : ""}{item.creditsDelta} · {item.status}</strong></div>) : <p style={{ color: "#64748b", fontSize: 12 }}>No AI credit activity yet.</p>}</div>
    </div>
    <div style={{ background: "#fff", border: "1px solid #e5eaf2", borderRadius: 14, padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Recent administration activity</h2><div style={{ marginTop: 10 }}>{audit.length ? audit.map(a => <div key={a.id} style={{ padding: "9px 0", borderTop: "1px solid #edf0f5", fontSize: 12 }}><strong>{a.action.replaceAll("_"," ")}</strong><span style={{ color: "#64748b" }}> · {new Date(a.createdAt).toLocaleString()}</span></div>) : <p style={{ color: "#64748b", fontSize: 12 }}>No management actions recorded yet.</p>}</div>
    </div>
  </section>;
}
