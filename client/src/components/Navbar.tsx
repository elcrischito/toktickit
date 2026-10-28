import React from "react";
import { useAuth } from "../context/AuthContext";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header style={{ backgroundColor: "#1b4332", color: "#ffffff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>TikTockIT</h1>
        <nav style={{ display: "flex", gap: 16 }}>
          {user?.role === "REQUESTER" && <a href="/my-tickets" style={{ color: "#ffffff", textDecoration: "none" }}>My Tickets</a>}
          {(user?.role === "IT_STAFF" || user?.role === "ADMIN") && <a href="/queue" style={{ color: "#ffffff", textDecoration: "none" }}>My Queue</a>}
          {user?.role === "ADMIN" && <a href="/admin/users" style={{ color: "#ffffff", textDecoration: "none" }}>Admin Users</a>}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span>{user?.fullName} ({user?.role})</span>
        <button onClick={logout} style={{ backgroundColor: "transparent", border: "1px solid #ffffff", color: "#ffffff", padding: "6px 12px", borderRadius: 4, cursor: "pointer" }}>
          Logout
        </button>
      </div>
    </header>
  );
};
