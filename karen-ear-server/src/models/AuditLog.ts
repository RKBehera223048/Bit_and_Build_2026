import mongoose, { Schema, Document } from "mongoose";
import type { AuditEntry as IAuditEntry } from "../types";

export interface AuditDocument extends Omit<IAuditEntry, "id">, Document {}

const AuditSchema = new Schema<AuditDocument>(
  {
    incidentId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ["created", "merged", "escalated", "overridden", "resolved", "invalidated"],
      required: true,
    },
    previousValue: { type: Schema.Types.Mixed, default: null },
    newValue: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, required: true },
    timestamp: { type: String, required: true },
    actor: {
      type: String,
      enum: ["system", "dispatcher"],
      required: true,
    },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const AuditModel = mongoose.model<AuditDocument>("AuditLog", AuditSchema);
