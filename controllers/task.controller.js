import { validationResult } from "express-validator";
import Task from "../models/task.model.js";

// Import WebSocket Server
import setupWebSocket from "../websocket/index.js";
const io = setupWebSocket;
// @desc   Create a new Task
// @route  POST /api/tasks
// @access Admin & Manager
export const createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, description, dueDate, assignee } = req.body;

  try {
    // Ensure user is Admin or Manager
    if (req.user.role === "member") {
      return res.status(403).json({ message: "Access Denied" });
    }

    const task = new Task({
      title,
      description,
      dueDate,
      assignee,
      tenant_id: req.user.tenant_id, // Tenant Isolation
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc   Get all tasks for the authenticated user's tenant
// @route  GET /api/tasks
// @access All Roles
export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ tenant_id: req.user.tenant_id }).populate(
      "assignee",
      "name email"
    );
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc   Update a task
// @route  PUT /api/tasks/:id
// @access Admin, Manager, Assignee
// export const updateTask = async (req, res) => {
//   try {
//     const task = await Task.findById(req.params.id);

//     if (!task) return res.status(404).json({ message: "Task not found" });

//     // Check Tenant Isolation
//     if (task.tenant_id.toString() !== req.user.tenant_id.toString()) {
//       return res.status(403).json({ message: "Access Denied" });
//     }

//     Object.assign(task, req.body);
//     await task.save();

//     // Access WebSocket instance from the request
//     const io = req.app.get("io");
//     io.emit("taskUpdated", task);

//     res.json(task);
//   } catch (error) {
//     console.error("Error updating task:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
export const updateTask = async (req, res) => {
  try {
    const { title, description, status, dueDate, assignee, dependencies } =
      req.body;

    let task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Ensure status is valid before updating
    const validStatuses = ["pending", "in-progress", "completed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Update task details
    task.title = title || task.title;
    task.description = description || task.description;
    task.status = status || task.status;
    task.dueDate = dueDate || task.dueDate;
    task.assignee = assignee || task.assignee;
    task.dependencies = dependencies || task.dependencies;

    await task.save();

    res.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc   Delete a task
// @route  DELETE /api/tasks/:id
// @access Admin Only
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Check Tenant Isolation
    if (task.tenant_id.toString() !== req.user.tenant_id.toString()) {
      return res.status(403).json({ message: "Access Denied" });
    }

    // Only Admin can delete
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only Admin can delete tasks" });
    }

    await task.deleteOne();
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const completeTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Ensure user has permission to complete the task
    if (
      req.user.role !== "admin" &&
      req.user.role !== "manager" &&
      task.assignee.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access Denied" });
    }

    task.status = "completed";
    await task.save();

    // Find tasks that depend on this task
    const dependentTasks = await Dependency.find({
      dependent_task_id: task._id,
    });

    // Notify all dependencies that this task is completed
    for (const dep of dependentTasks) {
      io.emit("dependencyCompleted", {
        taskId: dep.task_id,
        completedTask: task,
      });
    }

    res.json({ message: "Task marked as completed", task });
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc   Get task by ID
// @route  GET /api/tasks/:id
// @access Private (Requires authentication)
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ message: "Server error" });
  }
};
