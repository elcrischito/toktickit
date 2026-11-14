import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { ChangePassword } from "./pages/ChangePassword";
import { Navbar } from "./components/Navbar";
import { StaffQueue } from "./pages/StaffQueue";
import { UserManagement } from "./pages/UserManagement";
import { TicketDetail } from "./pages/TicketDetail";
import { RequesterTickets } from "./pages/RequesterTickets";
import { RequesterCreateTicket } from "./pages/RequesterCreateTicket";
import { StaffDashboard, QueueDrillDownFilter } from "./pages/StaffDashboard";
import { RequesterDashboard } from "./pages/RequesterDashboard";

const MainContent: React.FC = () => {
  const { user } = useAuth();
  const [path, setPath] = useState<string>(() => window.location.pathname);
  const [queueFilter, setQueueFilter] = useState<QueueDrillDownFilter | undefined>(undefined);
  const [requesterStatusFilter, setRequesterStatusFilter] = useState<string>("");

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (nextPath: string) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };

  if (!user) {
    return <Login />;
  }

  if (user.mustChangePassword) {
    return <ChangePassword />;
  }

  const ticketMatch = path.match(/^\/tickets\/([^/]+)$/);

  const renderPage = () => {
    if (ticketMatch) {
      const ticketId = ticketMatch[1];
      return (
        <TicketDetail
          ticketId={ticketId}
          onBack={() => navigate(user.role === "REQUESTER" ? "/my-tickets" : "/queue")}
        />
      );
    }

    if (user.role === "REQUESTER") {
      if (path === "/create-ticket") {
        return (
          <RequesterCreateTicket
            onSuccess={() => navigate("/my-tickets")}
            onCancel={() => navigate("/my-tickets")}
            onViewTicket={(id) => navigate(`/tickets/${id}`)}
          />
        );
      }
      if (path === "/my-tickets") {
        return (
          <RequesterTickets
            initialStatus={requesterStatusFilter}
            onSelectTicket={(id) => navigate(`/tickets/${id}`)}
            onCreateNew={() => navigate("/create-ticket")}
          />
        );
      }
      return (
        <RequesterDashboard
          onNavigateMyTickets={(statusFilter) => {
            setRequesterStatusFilter(statusFilter || "");
            navigate("/my-tickets");
          }}
          onCreateTicket={() => navigate("/create-ticket")}
          onSelectTicket={(id) => navigate(`/tickets/${id}`)}
        />
      );
    }

    if (path === "/admin/users" && user.role === "ADMIN") {
      return <UserManagement />;
    }

    if (path === "/queue") {
      return (
        <StaffQueue
          initialFilter={queueFilter}
          onSelectTicket={(id) => navigate(`/tickets/${id}`)}
        />
      );
    }

    return (
      <StaffDashboard
        onNavigateQueue={(filter) => {
          setQueueFilter(filter);
          navigate("/queue");
        }}
        onSelectTicket={(id) => navigate(`/tickets/${id}`)}
        onNavigateAdminUsers={() => navigate("/admin/users")}
      />
    );
  };

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar onNavigate={navigate} />
      <main>{renderPage()}</main>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

export default App;
