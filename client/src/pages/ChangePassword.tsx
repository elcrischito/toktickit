import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export const ChangePassword: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { token, updateUserStatus } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password change failed");

      updateUserStatus(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: "60px auto", padding: 24, border: "1px solid #e9ecef", borderRadius: 8, backgroundColor: "#ffffff" }}>
      <h2 style={{ color: "#1b4332", textAlign: "center" }}>Change Your Password</h2>
      <p style={{ color: "#6c757d", fontSize: 14, textAlign: "center", marginBottom: 20 }}>
        You must change your initial password before accessing the application.
      </p>
      {error && <div style={{ color: "#d90429", padding: 10, backgroundColor: "#f8d7da", borderRadius: 4, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Current (Temporary) Password</label>
          <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", marginBottom: 4 }}>New Password</label>
          <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 4 }}>Confirm New Password</label>
          <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }} />
        </div>
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 12, backgroundColor: "#1b4332", color: "#fff", border: "none", borderRadius: 4, fontWeight: "bold", cursor: "pointer" }}>
          {loading ? "Updating..." : "Continue"}
        </button>
      </form>
    </div>
  );
};
