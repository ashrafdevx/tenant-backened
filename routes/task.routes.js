import express from "express";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  getTaskById,
} from "../controllers/task.controller.js";
import { protect } from "../middleware/authMiddleware.js";
import { body } from "express-validator";

const taskRouter = express.Router();

// Create Task (Admin & Manager Only)
taskRouter.post(
  "/",
  protect,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("dueDate").isISO8601().toDate().withMessage("Valid due date required"),
    body("assignee").notEmpty().withMessage("Assignee is required"),
  ],
  createTask
);

// Get All Tasks (All Roles)
taskRouter.get("/", protect, getTasks);

// Update Task (Admin, Manager, or Assignee)
taskRouter.put("/:id", protect, updateTask);

// Delete Task (Admin Only)
taskRouter.delete("/:id", protect, deleteTask);
taskRouter.get("/:id", protect, getTaskById);

export default taskRouter;
