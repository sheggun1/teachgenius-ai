"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type WorkspaceType = "PERSONAL_TEACHER" | "SCHOOL";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("PERSONAL_TEACHER");
  const [workspaceName, setWorkspaceName] = useState("My Teacher Workspace");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    if (password.length < 10) {
      setError("Use a password with at least 10 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password, workspaceType, workspaceName }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "We could not create your account. Please try again.");
        return;
      }
      setSuccess("Your account has been created. You can now sign in.");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Unable to reach TeachGenius AI. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "12px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    fontSize: 15,
    marginTop: 6,
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "48px 18px", color: "#172033" }}>
      <section style={{ maxWidth: 520, margin: "0 auto", background: "#fff", padding: 32, borderRadius: 16, boxShadow: "0 12px 35px rgba(15,23,42,.08)" }}>
        <Link href="/" style={{ color: "#3157c8", textDecoration: "none", fontWeight: 700 }}>TeachGenius AI</Link>
        <h1 style={{ margin: "22px 0 8px", fontSize: 30 }}>Create your account</h1>
        <p style={{ color: "#64748b", marginTop: 0, lineHeight: 1.5 }}>Join TeachGenius AI to prepare and manage teaching resources.</p>

        {error && <p role="alert" style={{ background: "#fff1f2", color: "#be123c", padding: 12, borderRadius: 8 }}>{error}</p>}
        {success && <p role="status" style={{ background: "#ecfdf5", color: "#047857", padding: 12, borderRadius: 8 }}>{success} <Link href="/login">Sign in</Link></p>}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 15 }}>
          <label style={{ fontWeight: 600 }}>Full name
            <input required minLength={2} maxLength={100} autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name" style={fieldStyle} />
          </label>
          <label style={{ fontWeight: 600 }}>Email address
            <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={fieldStyle} />
          </label>
          <label style={{ fontWeight: 600 }}>Password
            <input required type="password" minLength={10} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" style={fieldStyle} />
          </label>
          <label style={{ fontWeight: 600 }}>Confirm password
            <input required type="password" minLength={10} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Enter your password again" style={fieldStyle} />
          </label>

          <fieldset style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, display: "grid", gap: 10 }}>
            <legend style={{ fontWeight: 600, padding: "0 5px" }}>Workspace type</legend>
            <label style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <input type="radio" name="workspaceType" checked={workspaceType === "PERSONAL_TEACHER"} onChange={() => { setWorkspaceType("PERSONAL_TEACHER"); setWorkspaceName("My Teacher Workspace"); }} />
              Personal teacher workspace
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <input type="radio" name="workspaceType" checked={workspaceType === "SCHOOL"} onChange={() => { setWorkspaceType("SCHOOL"); setWorkspaceName(""); }} />
              School workspace
            </label>
          </fieldset>

          <label style={{ fontWeight: 600 }}>Workspace name
            <input required minLength={2} maxLength={120} value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder={workspaceType === "SCHOOL" ? "Your school name" : "Your workspace name"} style={fieldStyle} />
          </label>

          <button type="submit" disabled={loading} style={{ border: 0, borderRadius: 9, padding: 14, background: loading ? "#94a3b8" : "#3157c8", color: "#fff", fontSize: 16, fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p style={{ marginTop: 22, color: "#64748b" }}>Already have an account? <Link href="/login" style={{ color: "#3157c8", fontWeight: 600 }}>Sign in</Link></p>
      </section>
    </main>
  );
}
