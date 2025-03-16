import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    dueDate: { type: Date, required: true },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    }, // Multi-Tenant Isolation
    dependencies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task", // Reference to other tasks
      },
    ],
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", TaskSchema);
export default Task;
