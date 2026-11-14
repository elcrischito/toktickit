import React from "react";
import { useAuth } from "../context/AuthContext";

interface NavbarProps {
  onNavigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();

  const handleLink = (e: React.MouseEvent, path: string) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(path);
    }
  };

  return (
    <header style={{ backgroundColor: "#1b4332", color: "#ffffff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <a
          href="/dashboard"
          onClick={(e) => handleLink(e, "/dashboard")}
          style={{ color: "#ffffff", textDecoration: "none", fontSize: 20, fontWeight: "bold" }}
        >
          TokTickIT
        </a>
        <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <a href="/dashboard" onClick={(e) => handleLink(e, "/dashboard")} style={{ color: "#d8f3dc", textDecoration: "none", fontWeight: 600 }}>
            Dashboard
          </a>
          {user?.role === "REQUESTER" && (
            <>
              <a href="/my-tickets" onClick={(e) => handleLink(e, "/my-tickets")} style={{ color: "#ffffff", textDecoration: "none" }}>My Tickets</a>
              <a href="/create-ticket" onClick={(e) => handleLink(e, "/create-ticket")} style={{ color: "#ffffff", textDecoration: "none" }}>Create Ticket</a>
            </>
          )}
          {(user?.role === "IT_STAFF" || user?.role === "ADMIN") && (
            <a href="/queue" onClick={(e) => handleLink(e, "/queue")} style={{ color: "#ffffff", textDecoration: "none" }}>Ticket Queue</a>
          )}
          {user?.role === "ADMIN" && (
            <a href="/admin/users" onClick={(e) => handleLink(e, "/admin/users")} style={{ color: "#ffffff", textDecoration: "none" }}>Admin Users</a>
          )}
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
