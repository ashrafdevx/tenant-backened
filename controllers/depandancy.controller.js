import Dependency from "../models/dependency.model.js";
import Task from "../models/task.model.js";

import setupWebSocket from "../websocket/index.js";
const io = setupWebSocket;
// @desc   Add a dependency between tasks
// @route  POST /api/tasks/:id/dependencies
// @access Admin & Manager Only
export const addDependency = async (req, res) => {
  const { dependent_task_id } = req.body;
  const task_id = req.params.id;

  try {
    const task = await Task.findById(task_id);
    const dependentTask = await Task.findById(dependent_task_id);

    if (!task || !dependentTask) {
      return res.status(404).json({ message: "Task(s) not found" });
    }

    // Ensure both tasks belong to the same tenant
    if (
      task.tenant_id.toString() !== req.user.tenant_id.toString() ||
      dependentTask.tenant_id.toString() !== req.user.tenant_id.toString()
    ) {
      return res.status(403).json({ message: "Access Denied" });
    }

    // Check for circular dependencies
    const existingDependency = await Dependency.findOne({
      task_id: dependent_task_id,
      dependent_task_id: task_id,
    });

    if (existingDependency) {
      return res.status(400).json({ message: "Circular dependency detected!" });
    }

    const dependency = new Dependency({
      task_id,
      dependent_task_id,
      tenant_id: req.user.tenant_id,
    });

    await dependency.save();
    res.status(201).json(dependency);
  } catch (error) {
    console.error("Error adding dependency:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc   Get all dependencies for a task
// @route  GET /api/tasks/:id/dependencies
// @access All Roles
export const getDependencies = async (req, res) => {
  try {
    const dependencies = await Dependency.find({ task_id: req.params.id })
      .populate("dependent_task_id", "title status")
      .lean();

    res.json(dependencies);
  } catch (error) {
    console.error("Error fetching dependencies:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc   Remove a dependency between tasks
// @route  DELETE /api/tasks/:id/dependencies/:dependencyId
// @access Admin & Manager Only
export const deleteDependency = async (req, res) => {
  const { id, dependencyId } = req.params; // id = task_id, dependencyId = dependent_task_id

  try {
    // Find and delete the dependency
    const dependency = await Dependency.findOneAndDelete({
      task_id: id,
      dependent_task_id: dependencyId,
    });

    if (!dependency) {
      return res.status(404).json({ message: "Dependency not found" });
    }

    res.json({ message: "Dependency removed successfully" });
  } catch (error) {
    console.error("Error deleting dependency:", error);
    res.status(500).json({ message: "Server error" });
  }
};
