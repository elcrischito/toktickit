import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export const UserManagement: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [userRole, setUserRole] = useState("REQUESTER");
  const [initialPassword, setInitialPassword] = useState("Password123!");
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    try {
      const query = new URLSearchParams({ search, role }).toString();
      const res = await fetch(`/api/admin/users?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, role]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName, email, role: userRole, initialPassword, isActive: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      setShowCreateModal(false);
      setFullName("");
      setEmail("");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleUserActive = async (user: any) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) fetchUsers();
      else {
        const data = await res.json();
        alert(data.error || "Action prohibited");
      }
    } catch (err) {
      console.error("Error toggling user status", err);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: "#1b4332", margin: 0 }}>User Management</h2>
        <button onClick={() => setShowCreateModal(true)} style={{ backgroundColor: "#1b4332", color: "#fff", padding: "10px 16px", border: "none", borderRadius: 4, fontWeight: "bold", cursor: "pointer" }}>
          + Create User
        </button>
      </div>

      {/* Filter and Search */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }}>
          <option value="">All Roles</option>
          <option value="REQUESTER">Requester</option>
          <option value="IT_STAFF">IT Staff</option>
          <option value="ADMIN">Administrator</option>
        </select>
      </div>

      {/* Users Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#ffffff", border: "1px solid #e9ecef" }}>
        <thead>
          <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e9ecef", textAlign: "left" }}>
            <th style={{ padding: 12 }}>Name</th>
            <th style={{ padding: 12 }}>Email</th>
            <th style={{ padding: 12 }}>Role</th>
            <th style={{ padding: 12 }}>Status</th>
            <th style={{ padding: 12 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid #e9ecef" }}>
              <td style={{ padding: 12, fontWeight: 500 }}>{u.fullName}</td>
              <td style={{ padding: 12 }}>{u.email}</td>
              <td style={{ padding: 12 }}>
                <span style={{ padding: "4px 8px", borderRadius: 4, backgroundColor: "#e2e3e5", fontSize: 12 }}>{u.role}</span>
              </td>
              <td style={{ padding: 12 }}>
                <span style={{ color: u.isActive ? "#0f5132" : "#842029", fontWeight: "bold", fontSize: 13 }}>
                  {u.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td style={{ padding: 12 }}>
                <button onClick={() => toggleUserActive(u)} style={{ backgroundColor: u.isActive ? "#d90429" : "#52b788", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
                  {u.isActive ? "Deactivate" : "Activate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Create User Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ backgroundColor: "#fff", padding: 24, borderRadius: 8, width: 400 }}>
            <h3 style={{ color: "#1b4332", marginTop: 0 }}>Create New User</h3>
            {error && <div style={{ color: "#d90429", marginBottom: 12 }}>{error}</div>}
            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4 }}>Full Name</label>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4 }}>Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4 }}>Role</label>
                <select value={userRole} onChange={(e) => setUserRole(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}>
                  <option value="REQUESTER">Requester</option>
                  <option value="IT_STAFF">IT Staff</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 4 }}>Initial Password</label>
                <input type="text" required value={initialPassword} onChange={(e) => setInitialPassword(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }} />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: "8px 16px", border: "1px solid #ccc", borderRadius: 4, backgroundColor: "#fff" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", border: "none", borderRadius: 4, backgroundColor: "#1b4332", color: "#fff" }}>Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
