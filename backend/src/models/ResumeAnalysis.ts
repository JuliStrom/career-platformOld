import mongoose, { Schema } from "mongoose";
import type { AnalysisGoal } from "../schemas/resumeAnalysis";

export interface AnalysisRecord {
  secretHash: string;
  ownerId: string | null;
  guestSessionId?: string;
  attribution?: Record<string, unknown>;
  status:
    | "pending"
    | "reading"
    | "evaluating"
    | "matching"
    | "completed"
    | "failed";
  goal: AnalysisGoal;
  source: {
    kind: "pdf" | "docx" | "text";
    name: string;
    data?: Buffer;
    originalData?: Buffer;
    text?: string;
  };
  sourceExpiresAt?: Date;
  expiresAt?: Date;
  result?: Record<string, any>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<AnalysisRecord>(
  {
    secretHash: { type: String, required: true, select: false },
    ownerId: { type: String, default: null, index: true },
    guestSessionId: { type: String, index: true },
    attribution: Schema.Types.Mixed,
    status: { type: String, required: true, index: true },
    goal: { type: Schema.Types.Mixed, required: true },
    source: {
      type: new Schema(
        {
          kind: { type: String, required: true },
          name: { type: String, required: true },
          data: Buffer,
          originalData: Buffer,
          text: String,
        },
        { _id: false },
      ),
      required: true,
      select: false,
    },
    sourceExpiresAt: { type: Date, required: true },
    expiresAt: Date,
    result: { type: Schema.Types.Mixed, select: false },
    error: String,
  },
  { timestamps: true },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index(
  { sourceExpiresAt: 1 },
  { partialFilterExpression: { source: { $exists: true } } },
);
export default mongoose.model<AnalysisRecord>("ResumeAnalysis", schema);
