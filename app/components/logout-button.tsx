"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setLoading(false);
      window.alert("Unable to sign out. Please try again.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      style={{
        border: "1px solid #dbe3ef",
        background: "#fff",
        color: "#344054",
        borderRadius: 9,
        padding: "10px 14px",
        fontWeight: 600,
        cursor: loading ? "wait" : "pointer",
      }}
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
