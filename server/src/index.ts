import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import staffTicketsRoutes from "./routes/staffTickets";
import commentsNotesRoutes from "./routes/commentsNotes";
import adminUsersRoutes from "./routes/adminUsers";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Enregistrement des routes
app.use("/api/auth", authRoutes);
app.use("/api/staff/tickets", staffTicketsRoutes);
app.use("/api/tickets", commentsNotesRoutes);
app.use("/api/admin/users", adminUsersRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
