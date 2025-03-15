import { Server } from "socket.io";

const setupWebSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Allow all origins (adjust for production)
    },
  });

  io.on("connection", (socket) => {
    console.log("New WebSocket Connection:", socket.id);

    // Listen for task updates
    socket.on("taskUpdated", (task) => {
      console.log(`Task Updated: ${task.title}`);
      io.emit("taskUpdated", task); // Broadcast update
    });

    // Listen for dependency completion
    socket.on("dependencyCompleted", ({ taskId, completedTask }) => {
      console.log(`Dependency Completed for Task ${taskId}`);
      io.emit("dependencyCompleted", { taskId, completedTask });
    });

    socket.on("disconnect", () => {
      console.log("User Disconnected:", socket.id);
    });
  });

  return io;
};

export default setupWebSocket;
