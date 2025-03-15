import mongoose from "mongoose";

const DependencySchema = new mongoose.Schema(
  {
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    dependent_task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    }, // Tenant Isolation
  },
  { timestamps: true }
);

// Prevent Circular Dependencies
DependencySchema.pre("save", async function (next) {
  if (this.task_id.toString() === this.dependent_task_id.toString()) {
    return next(new Error("A task cannot depend on itself."));
  }
  next();
});

const Dependency = mongoose.model("Dependency", DependencySchema);
export default Dependency;
