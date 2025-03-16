import dotenv from "dotenv";
import express from "express";
import http from "http"; // Needed for WebSocket
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import taskRouter from "./routes/task.routes.js";
import depandencyRouter from "./routes/depandency.routes.js";
import setupWebSocket from "./websocket/index.js";

dotenv.config(); // ✅ Load .env correctly

const app = express();
const server = http.createServer(app); // Create HTTP Server
const io = setupWebSocket(server); // Initialize WebSocket
app.use(express.json());
app.use(cors());

connectDB(); // Connect to MongoDB

app.get("/test", (req, res) => {
  res.send("Done Deployment");
});
app.use("/api/auth", authRoutes); // Authentication Routes
app.use("/api/tasks", taskRouter); // Register Task Routes
app.use("/api/tasks", depandencyRouter); // Register Dependency Routes

// Attach io to request object so controllers can access it
app.set("io", io);
const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
