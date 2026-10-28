import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      login(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 24, border: "1px solid #e9ecef", borderRadius: 8, backgroundColor: "#ffffff" }}>
      <h2 style={{ color: "#1b4332", textAlign: "center", marginBottom: 24 }}>TikTockIT — Sign In</h2>
      {error && <div style={{ color: "#d90429", padding: 10, backgroundColor: "#f8d7da", borderRadius: 4, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Email Address</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
        </div>
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 12, backgroundColor: "#1b4332", color: "#fff", border: "none", borderRadius: 4, fontWeight: "bold", cursor: "pointer" }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};
