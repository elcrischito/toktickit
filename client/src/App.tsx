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

const MainContent: React.FC = () => {
  const { user } = useAuth();
  const [path, setPath] = useState<string>(() => window.location.pathname);

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
          />
        );
      }
      return (
        <RequesterTickets
          onSelectTicket={(id) => navigate(`/tickets/${id}`)}
          onCreateNew={() => navigate("/create-ticket")}
        />
      );
    }

    if (path === "/admin/users" && user.role === "ADMIN") {
      return <UserManagement />;
    }

    return <StaffQueue onSelectTicket={(id) => navigate(`/tickets/${id}`)} />;
  };

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
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
