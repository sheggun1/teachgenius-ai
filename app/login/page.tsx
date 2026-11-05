"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Sign in failed. Check your details and try again.");
        return;
      }
      router.replace("/");
      router.refresh();
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
    <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: "64px 18px", color: "#172033" }}>
      <section style={{ maxWidth: 460, margin: "0 auto", background: "#fff", padding: 32, borderRadius: 16, boxShadow: "0 12px 35px rgba(15,23,42,.08)" }}>
        <Link href="/" style={{ color: "#3157c8", textDecoration: "none", fontWeight: 700 }}>TeachGenius AI</Link>
        <h1 style={{ margin: "24px 0 8px", fontSize: 30 }}>Welcome back</h1>
        <p style={{ color: "#64748b", marginTop: 0, lineHeight: 1.5 }}>Sign in to continue to your teaching workspace.</p>

        {error && <p role="alert" style={{ background: "#fff1f2", color: "#be123c", padding: 12, borderRadius: 8 }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
          <label style={{ fontWeight: 600 }}>Email address
            <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={fieldStyle} />
          </label>
          <label style={{ fontWeight: 600 }}>Password
            <input required type="password" maxLength={128} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" style={fieldStyle} />
          </label>
          <button type="submit" disabled={loading} style={{ border: 0, borderRadius: 9, padding: 14, background: loading ? "#94a3b8" : "#3157c8", color: "#fff", fontSize: 16, fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={{ marginTop: 22, color: "#64748b" }}>New to TeachGenius AI? <Link href="/register" style={{ color: "#3157c8", fontWeight: 600 }}>Create an account</Link></p>
      </section>
    </main>
  );
}
