import express from "express";

import { body } from "express-validator";
import { loginUser, registerUser } from "../controllers/auth.controller.js";

const authRoutes = express.Router();

// Register User (Validation Included)
authRoutes.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("tenant_id").notEmpty().withMessage("Tenant ID is required"),
  ],
  registerUser
);

// Login User
authRoutes.post("/login", loginUser);

export default authRoutes;
