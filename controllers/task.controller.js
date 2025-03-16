import { validationResult } from "express-validator";
import Task from "../models/task.model.js";

// Import WebSocket Server
import setupWebSocket from "../websocket/index.js";
const io = setupWebSocket();
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
export const updateTask = async (req, res) => {
  try {
    const { title, description, status, dueDate, assignee, dependencies } =
      req.body;

    let task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Tenant isolation check
    if (task.tenant_id.toString() !== req.user.tenant_id.toString()) {
      return res
        .status(403)
        .json({ message: "Access Denied - Task belongs to different tenant" });
    }

    // Permission check - only admin, manager, or assignee can update
    if (
      req.user.role !== "admin" &&
      req.user.role !== "manager" &&
      task.assignee.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Access Denied - Insufficient permissions" });
    }

    // Ensure status is valid before updating
    const validStatuses = ["pending", "in-progress", "completed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Track if we're changing to completed status
    const statusChangedToCompleted =
      status === "completed" && task.status !== "completed";

    // Update task details
    task.title = title || task.title;
    task.description = description || task.description;
    task.status = status || task.status;
    task.dueDate = dueDate || task.dueDate;
    task.assignee = assignee || task.assignee;

    // Handle dependencies update if provided
    if (dependencies) {
      // Check for circular dependencies
      for (const depId of dependencies) {
        if (depId === task._id.toString()) {
          return res
            .status(400)
            .json({ message: "Task cannot depend on itself" });
        }
      }

      task.dependencies = dependencies;
    }

    // Update the timestamp
    task.updatedAt = Date.now();

    await task.save();

    // If task was completed, notify dependent tasks
    if (statusChangedToCompleted) {
      // Find tasks that depend on this completed task
      const dependentTasks = await Task.find({ dependencies: task._id });

      // Notify via WebSocket
      io.to(req.user.tenant_id.toString()).emit("taskCompleted", {
        taskId: task._id,
        completedBy: req.user._id,
        dependentTasks: dependentTasks.map((t) => t._id),
      });
    }

    // Notify about task update
    io.to(req.user.tenant_id.toString()).emit("taskUpdated", {
      task,
      updatedBy: req.user._id,
    });

    res.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// export const updateTask = async (req, res) => {
//   try {
//     const { title, description, status, dueDate, assignee, dependencies } =
//       req.body;

//     let task = await Task.findById(req.params.id);
//     if (!task) {
//       return res.status(404).json({ message: "Task not found" });
//     }

//     // Ensure status is valid before updating
//     const validStatuses = ["pending", "in-progress", "completed"];
//     if (status && !validStatuses.includes(status)) {
//       return res.status(400).json({ message: "Invalid status value" });
//     }

//     // Update task details
//     task.title = title || task.title;
//     task.description = description || task.description;
//     task.status = status || task.status;
//     task.dueDate = dueDate || task.dueDate;
//     task.assignee = assignee || task.assignee;
//     task.dependencies = dependencies || task.dependencies;

//     await task.save();

//     res.json(task);
//   } catch (error) {
//     console.error("Error updating task:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

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

// @desc   Check for circular dependencies
// @route  POST /api/tasks/:id/check-dependencies
// @access Private
export const checkCircularDependencies = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { dependencies } = req.body;

    // If no dependencies, no circular dependencies possible
    if (!dependencies || dependencies.length === 0) {
      return res.json({ hasCircular: false });
    }

    // Helper function to detect circular dependencies using DFS
    const detectCircular = async (
      currentId,
      visited = new Set(),
      path = []
    ) => {
      // If we've seen this task before in our current path, we have a cycle
      if (path.includes(currentId)) {
        return {
          hasCircular: true,
          path: [...path, currentId],
        };
      }

      // If we've already verified this path before, no need to check again
      if (visited.has(currentId)) {
        return { hasCircular: false };
      }

      visited.add(currentId);
      const newPath = [...path, currentId];

      // Get this task's dependencies
      const task = await Task.findById(currentId);
      if (!task) return { hasCircular: false };

      // For each dependency, recursively check
      for (const depId of task.dependencies || []) {
        const result = await detectCircular(depId, visited, newPath);
        if (result.hasCircular) return result;
      }

      return { hasCircular: false };
    };

    // For each new dependency, check if adding would create a cycle
    for (const depId of dependencies) {
      // We need to check if this new dependency would create a backward reference
      const depTask = await Task.findById(depId);
      if (!depTask) continue;

      // Temporarily add the current task as a dependency of this dependency to check
      const result = await detectCircular(depId, new Set(), [taskId]);

      if (result.hasCircular) {
        // Get readable task names for the path
        const pathWithNames = await Promise.all(
          result.path.map(async (id) => {
            const t = await Task.findById(id);
            return t ? t.title : id;
          })
        );

        return res.json({
          hasCircular: true,
          path: pathWithNames,
        });
      }
    }

    // If we get here, no circular dependencies found
    return res.json({ hasCircular: false });
  } catch (error) {
    console.error("Error checking dependencies:", error);
    res.status(500).json({ message: "Server error checking dependencies" });
  }
};
