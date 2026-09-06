import { useState } from "react";
import { RequesterProvider, useRequester } from "./RequesterContext.js";
import RequesterSelection from "./RequesterSelection.js";
import CreateTicket from "./CreateTicket.js";
import MyTickets from "./MyTickets.js";
import TicketDetail from "./TicketDetail.js";

type View = "home" | "create-ticket" | "ticket-detail";

function AppShell() {
  const { requester, changeRequester } = useRequester();
  const [view, setView] = useState<View>("home");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  if (!requester) {
    return <RequesterSelection />;
  }

  function openTicket(ticketId: number) {
    setSelectedTicketId(ticketId);
    setView("ticket-detail");
  }

  return (
    <div>
      <nav className="navbar navbar-dark px-4" style={{ backgroundColor: "#006B3C" }}>
        <span className="navbar-brand mb-0 h1">TokTickIT</span>
        <div className="d-flex align-items-center gap-3">
          <button
            className={`btn btn-sm ${view === "home" ? "btn-light" : "btn-outline-light"}`}
            onClick={() => setView("home")}
          >
            My Tickets
          </button>
          <button
            className={`btn btn-sm ${view === "create-ticket" ? "btn-light" : "btn-outline-light"}`}
            onClick={() => setView("create-ticket")}
          >
            Create Ticket
          </button>
          <span className="text-white ms-3">{requester.name}</span>
          <button className="btn btn-sm btn-outline-light" onClick={changeRequester}>
            Change Requester
          </button>
        </div>
      </nav>

      {view === "create-ticket" && <CreateTicket onViewMyTickets={() => setView("home")} />}
      {view === "home" && (
        <MyTickets onCreateTicket={() => setView("create-ticket")} onOpenTicket={openTicket} />
      )}
      {view === "ticket-detail" && selectedTicketId !== null && (
        <TicketDetail ticketId={selectedTicketId} onBack={() => setView("home")} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <AppShell />
    </RequesterProvider>
  );
}