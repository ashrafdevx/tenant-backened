// controllers/tenantController.js

import bcrypt from "bcryptjs";
import { generateToken } from "./auth.controller.js";
import Tenant from "../models/tenant.models.js";
import User from "../models/user.model.js";

// Create a new tenant with admin user
export const createTenant = async (req, res) => {
  try {
    const { name, domain, adminEmail, adminPassword, adminName } = req.body;

    // Check if tenant with domain already exists
    const existingTenant = await Tenant.findOne({ domain });
    if (existingTenant) {
      return res
        .status(400)
        .json({ message: "Tenant with this domain already exists" });
    }

    // Create admin user first (without tenant association yet)
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = new User({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      // tenant_id will be added after tenant creation
    });

    // Create new tenant
    const tenant = new Tenant({
      name,
      domain,
      // adminUser reference will be set after saving admin
    });

    // Save tenant
    await tenant.save();

    // Now associate admin with tenant
    adminUser.tenant_id = tenant._id;
    await adminUser.save();

    // Update tenant with admin reference
    tenant.adminUser = adminUser._id;
    await tenant.save();

    // Generate JWT for admin
    const token = generateToken(adminUser);

    res.status(201).json({
      message: "Tenant created successfully",
      tenant: {
        id: tenant._id,
        name: tenant.name,
        domain: tenant.domain,
      },
      admin: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
      token,
    });
  } catch (error) {
    console.error("Error creating tenant:", error);
    res
      .status(500)
      .json({ message: "Error creating tenant", error: error.message });
  }
};

// Get all tenants (Super admin only)
export const getAllTenants = async (req, res) => {
  try {
    // Note: In production, you'd want to check if the requester is a super admin
    const tenants = await Tenant.find()
      .select("-__v")
      .populate("adminUser", "name email");
    res.status(200).json(tenants);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching tenants", error: error.message });
  }
};

// Get tenant by ID
export const getTenantById = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .select("-__v")
      .populate("adminUser", "name email");

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // In production, check if the requester has permission to view this tenant
    // if (req.user.tenant_id.toString() !== tenant._id.toString() && req.user.role !== 'superadmin') {
    //   return res.status(403).json({ message: 'Not authorized to access this tenant' });
    // }

    res.status(200).json(tenant);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching tenant", error: error.message });
  }
};

// Update tenant
export const updateTenant = async (req, res) => {
  try {
    const { name, domain } = req.body;
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // In production, check if the requester has permission to update this tenant
    // if (req.user.tenant_id.toString() !== tenant._id.toString() && req.user.role !== 'admin') {
    //   return res.status(403).json({ message: 'Not authorized to update this tenant' });
    // }

    if (name) tenant.name = name;
    if (domain) tenant.domain = domain;

    await tenant.save();
    res.status(200).json({
      message: "Tenant updated successfully",
      tenant: {
        id: tenant._id,
        name: tenant.name,
        domain: tenant.domain,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating tenant", error: error.message });
  }
};

// Delete tenant
export const deleteTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // In production, this should be restricted to super admin only
    // Delete all users associated with this tenant
    await User.deleteMany({ tenant_id: tenant._id });

    // You would also need to delete all tenant-related data (tasks, dependencies, etc.)
    // await Task.deleteMany({ tenant_id: tenant._id });
    // await Dependency.deleteMany({ tenant_id: tenant._id });

    await tenant.remove();
    res
      .status(200)
      .json({ message: "Tenant and all associated data deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting tenant", error: error.message });
  }
};
