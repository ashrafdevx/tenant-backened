import mongoose from "mongoose";
import User from "../models/user.model.js";
import Tenant from "../models/tenant.models.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @desc   Register a new user
// @route  POST /api/auth/register
// @access Public

export const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let { name, email, password, role, tenant_id } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    let tenant;

    // If no `tenant_id` is provided, create a new tenant
    if (!tenant_id || tenant_id === "") {
      tenant = new Tenant({
        name: `${name}'s Organization`,
        domain: `${name.toLowerCase().replace(/\s/g, "")}.com`,
      });
      await tenant.save();
      tenant_id = tenant._id.toString(); // Assign the newly created tenant ID
    } else {
      // Validate tenant_id format
      if (!mongoose.Types.ObjectId.isValid(tenant_id)) {
        return res.status(400).json({ message: "Invalid tenant ID format" });
      }

      // Check if tenant exists
      tenant = await Tenant.findById(tenant_id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    }

    // Create new user & assign tenant_id properly
    user = new User({ name, email, password, role, tenant_id });
    await user.save();

    // If this is the first user, set them as tenant admin
    if (!tenant.adminUser) {
      tenant.adminUser = user._id;
      await tenant.save();
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({ token, user, tenant });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc   Login User
// @route  POST /api/auth/login
// @access Public
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).populate("tenant_id", "name");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({ token, user });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Server error" });
  }
};
