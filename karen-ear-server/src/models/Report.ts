import mongoose, { Schema, Document } from "mongoose";
import type { Report as IReport } from "../types";

export interface ReportDocument extends Omit<IReport, "id">, Document {}

const ReportSchema = new Schema<ReportDocument>(
  {
    receivedAt: { type: String, required: true },
    source: {
      type: String,
      enum: ["CALL", "SMS", "SOCIAL"],
      required: true,
    },
    rawText: { type: String, required: true },
    status: {
      type: String,
      enum: ["new", "processed", "flagged", "invalid"],
      default: "new",
    },
  },
  {
    timestamps: true,
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

export const ReportModel = mongoose.model<ReportDocument>("Report", ReportSchema);
