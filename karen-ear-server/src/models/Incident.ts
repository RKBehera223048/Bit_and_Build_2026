import mongoose, { Schema, Document } from "mongoose";
import type { Incident as IIncident, Extraction } from "../types";

export interface IncidentDocument extends Omit<IIncident, "id">, Document {}

const ExtractionSchema = new Schema<Extraction>(
  {
    incidentType: {
      type: String,
      enum: ["fire", "medical", "collapse", "trapped", "violence", "hazard", "creature", "suspicious", "other"],
      required: true,
    },
    summary: { type: String, required: true },
    locationText: { type: String, default: null },
    landmark: { type: String, default: null },
    peopleAtRisk: { type: Number, default: null },
    triageCategory: {
      type: String,
      enum: ["CAT1_PURPLE", "CAT2_RED", "CAT3_YELLOW", "CAT4_GREEN"],
      required: true,
    },
    hazards: [{ type: String }],
    confidence: { type: Number, required: true, min: 0, max: 1 },
    needsClarification: { type: Boolean, default: false },
    extractionMethod: {
      type: String,
      enum: ["jev-omni", "groq-llama", "rule-based"],
      required: true,
    },
  },
  { _id: false }
);

const IncidentSchema = new Schema<IncidentDocument>(
  {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    reportIds: [{ type: String }],
    extraction: { type: ExtractionSchema, required: true },
    priority: { type: Number, required: true, min: 0, max: 100 },
    triageCategory: {
      type: String,
      enum: ["CAT1_PURPLE", "CAT2_RED", "CAT3_YELLOW", "CAT4_GREEN"],
      required: true,
    },
    priorityReasons: [{ type: String }],
    corroborationCount: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["active", "dispatched", "resolved"],
      default: "active",
    },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
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

export const IncidentModel = mongoose.model<IncidentDocument>("Incident", IncidentSchema);
