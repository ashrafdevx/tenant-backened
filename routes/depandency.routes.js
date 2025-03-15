import express from "express";
import {
  addDependency,
  deleteDependency,
  getDependencies,
} from "../controllers/depandancy.controller.js";
import { protect } from "../middleware/authMiddleware.js";

const depandencyRouter = express.Router();

// Add Dependency (Admin & Manager Only)
depandencyRouter.post("/:id/dependencies", protect, addDependency);

// Get Dependencies for a Task

depandencyRouter.get("/:id/dependencies", protect, getDependencies);
depandencyRouter.delete(
  "/:id/dependencies/:dependencyId",
  protect,
  deleteDependency
);

export default depandencyRouter;
