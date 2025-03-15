import mongoose from "mongoose";

const TenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    domain: { type: String, unique: true, required: true },
    adminUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to admin user
  },
  { timestamps: true }
);

const Tenant = mongoose.model("Tenant", TenantSchema);
export default Tenant;
