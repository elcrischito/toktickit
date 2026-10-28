import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { ChangePassword } from "./pages/ChangePassword";
import { Navbar } from "./components/Navbar";
import { StaffQueue } from "./pages/StaffQueue";
import { UserManagement } from "./pages/UserManagement";

const MainContent: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  if (user.mustChangePassword) {
    return <ChangePassword />;
  }

  const path = window.location.pathname;

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <Navbar />
      <main>
        {path === "/admin/users" && user.role === "ADMIN" ? (
          <UserManagement />
        ) : (
          <StaffQueue />
        )}
      </main>
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
