"use client";
import { useEffect, useState } from "react";

type Workspace = { id: string; name: string; type: string; role?: string };
type Resource = { id: string; title: string; originalName: string; mimeType: string; fileSize: number; category: string; visibility: string; reviewStatus: string; reviewNote?: string | null; createdAt: string; uploadedBy: string; uploader: { displayName: string | null; email: string | null } };
const categories = ["CURRICULUM","SCHEME_OF_WORK","LESSON_NOTE","LESSON_PLAN","ASSIGNMENT","WORKSHEET","QUESTION_PAPER","PRESENTATION","REFERENCE","OTHER"];
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, x => x.toUpperCase());
const panel: React.CSSProperties = { background: "#fff", border: "1px solid #e5eaf2", borderRadius: 14, padding: 20 };
const field: React.CSSProperties = { width: "100%", border: "1px solid #d8e0ec", borderRadius: 9, padding: "11px 12px", background: "#fff", color: "#172033", fontSize: 13 };

export default function ResourcesClient({ workspaces, isPlatformAdmin, userId }: { workspaces: Workspace[]; isPlatformAdmin: boolean; userId: string }) {
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id || "");
  const [resources, setResources] = useState<Resource[]>([]);
  const [canReview, setCanReview] = useState(isPlatformAdmin);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("REFERENCE");
  const [file, setFile] = useState<File | null>(null);
  const [requestReview, setRequestReview] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    if (!workspaceId) return;
    const response = await fetch("/api/workspaces/" + workspaceId + "/resources");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load resources");
    setResources(data.resources || []);
    setCanReview(!!data.canReview);
  }
  useEffect(() => { load().catch(e => setNotice(e.message)); }, [workspaceId]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !workspaceId) return;
    setBusy(true); setNotice("");
    try {
      const form = new FormData();
      form.append("file", file); form.append("title", title.trim() || file.name);
      form.append("category", category); form.append("requestReview", String(requestReview));
      const response = await fetch("/api/workspaces/" + workspaceId + "/resources", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setNotice(data.message); setFile(null); setTitle("");
      const input = document.getElementById("resource-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await load();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); }
  }

  async function review(resourceId: string, action: "APPROVE" | "REJECT") {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/workspaces/" + workspaceId + "/resources/" + resourceId, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Review failed");
      setNotice(action === "APPROVE" ? "Resource approved and shared with this workspace." : "Resource rejected and kept private to its uploader.");
      await load();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Review failed"); }
    finally { setBusy(false); }
  }

  async function remove(resourceId: string) {
    if (!window.confirm("Delete this uploaded resource permanently?")) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/workspaces/" + workspaceId + "/resources/" + resourceId, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Delete failed");
      setNotice("Resource deleted."); await load();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Delete failed"); }
    finally { setBusy(false); }
  }

  return <div style={{ display: "grid", gap: 18 }}>
    <section style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <div><h2 style={{ margin: 0, fontSize: 18 }}>Upload a resource</h2><p style={{ color: "#64748b", fontSize: 12, margin: "6px 0 0" }}>Maximum 8 MB per file. PDF, Word, PowerPoint, Excel, TXT, CSV, JPG and PNG are accepted.</p></div>
        <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "7px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800 }}>Secure workspace storage</span>
      </div>
      {workspaces.length > 0 && <label style={{ display: "block", marginTop: 16, fontSize: 12, fontWeight: 700 }}>Workspace<select value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} style={{ ...field, marginTop: 6 }}>{workspaces.map(w => <option key={w.id} value={w.id}>{w.name}{w.role ? " · " + label(w.role) : ""}</option>)}</select></label>}
      <form onSubmit={upload} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 14, alignItems: "end" }}>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Resource title<input value={title} onChange={e => setTitle(e.target.value)} maxLength={180} placeholder="e.g. JSS2 Basic Science Scheme" style={{ ...field, marginTop: 6 }} /></label>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Category<select value={category} onChange={e => setCategory(e.target.value)} style={{ ...field, marginTop: 6 }}>{categories.map(c => <option key={c} value={c}>{label(c)}</option>)}</select></label>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Choose file<input id="resource-file" type="file" accept=".pdf,.doc,.docx,.pptx,.xlsx,.txt,.csv,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] || null)} required style={{ ...field, marginTop: 6 }} /></label>
        {!canReview && <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#475569" }}><input type="checkbox" checked={requestReview} onChange={e => setRequestReview(e.target.checked)} /> Submit for School Admin approval and sharing</label>}
        <button disabled={busy || !file || !workspaceId} style={{ border: 0, borderRadius: 9, background: "#155eef", color: "#fff", padding: 12, fontWeight: 800, cursor: "pointer" }}>{busy ? "Working…" : "↑ Upload resource"}</button>
      </form>
      {notice && <p role="status" style={{ background: "#eff6ff", color: "#1e40af", borderRadius: 8, padding: 11, fontSize: 12, margin: "14px 0 0" }}>{notice}</p>}
    </section>
    <section style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "center" }}><div><h2 style={{ margin: 0, fontSize: 18 }}>Workspace resources</h2><p style={{ color: "#64748b", fontSize: 12, margin: "5px 0 0" }}>Review pending uploads, download files and manage your materials.</p></div><strong style={{ fontSize: 22 }}>{resources.length}</strong></div>
      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        {resources.map(r => <article key={r.id} style={{ border: "1px solid #e8edf4", borderRadius: 11, padding: 14, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 200, flex: 1 }}><strong style={{ fontSize: 14 }}>{r.title}</strong><div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{r.originalName} · {(r.fileSize / 1024 / 1024).toFixed(2)} MB · {label(r.category)}</div><div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>Uploaded by {r.uploader.displayName || r.uploader.email || "Workspace member"} · {new Date(r.createdAt).toLocaleDateString()}</div></div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "5px 8px", background: r.reviewStatus === "APPROVED" ? "#ecfdf3" : r.reviewStatus === "PENDING" ? "#fff7ed" : "#fef2f2", color: r.reviewStatus === "APPROVED" ? "#166534" : r.reviewStatus === "PENDING" ? "#9a3412" : "#b91c1c" }}>{label(r.reviewStatus)}</span>
            <a href={"/api/workspaces/" + workspaceId + "/resources/" + r.id + "/file"} style={{ color: "#155eef", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>Download</a>
            {canReview && r.reviewStatus === "PENDING" && <><button disabled={busy} onClick={() => review(r.id, "APPROVE")} style={{ border: 0, borderRadius: 7, padding: "7px 9px", background: "#dcfce7", color: "#166534", fontWeight: 700 }}>Approve</button><button disabled={busy} onClick={() => review(r.id, "REJECT")} style={{ border: 0, borderRadius: 7, padding: "7px 9px", background: "#fee2e2", color: "#991b1b", fontWeight: 700 }}>Reject</button></>}
            {(canReview || r.uploadedBy === userId) && <button disabled={busy} onClick={() => remove(r.id)} style={{ border: 0, borderRadius: 7, padding: "7px 9px", background: "#f1f5f9", color: "#475569", fontWeight: 700 }}>Delete</button>}
          </div>
        </article>)}
        {resources.length === 0 && <p style={{ color: "#64748b", fontSize: 13, padding: 18, textAlign: "center" }}>No resources uploaded to this workspace yet.</p>}
      </div>
    </section>
  </div>;
}
