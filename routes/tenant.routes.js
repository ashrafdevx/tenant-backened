// routes/tenantRoutes.js
import express from "express";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  createTenant,
  deleteTenant,
  getAllTenants,
  getTenantById,
  updateTenant,
} from "../controllers/tenant.controller.js";

const tenentrouter = express.Router();

// Public route for creating new tenants (in production, you might restrict this)
tenentrouter.post("/", createTenant);

// Protected routes
tenentrouter.get("/", protect, authorizeRoles("superadmin"), getAllTenants);
tenentrouter.get("/:id", protect, getTenantById);
tenentrouter.put("/:id", protect, authorizeRoles("admin"), updateTenant);
tenentrouter.delete(
  "/:id",
  protect,
  authorizeRoles("superadmin"),
  deleteTenant
);

export default tenentrouter;
