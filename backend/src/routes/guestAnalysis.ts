import { Router, type Request, type Response } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import mongoose from "mongoose";
import { z } from "zod";
import { readDocx } from "../services/resumeDocx";
import authMiddleware from "../middleware/authMiddleware";
import type { AuthRequest } from "../types";
import ResumeAnalysis from "../models/ResumeAnalysis";
import { goalSchema, publicPreview } from "../schemas/resumeAnalysis";
import {
  reserveAnalysis,
  releaseAnalysis,
  launchAnalysis,
} from "../services/resumeQueue";

import { getAiConfig } from "../services/resumeAi";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 10,
    fieldSize: 100000,
  },
});
const createLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "analysis_rate_limit" },
  standardHeaders: true,
  legacyHeaders: false,
});
const hash = (secret: string) =>
  crypto.createHash("sha256").update(secret).digest("hex");
const failure = (res: Response, status: number, error: string) =>
  res.status(status).json({ error });

export function secretMatches(secret: unknown, expected: string) {
  if (typeof secret !== "string" || !/^[a-f0-9]{64}$/.test(secret))
    return false;
  const actual = Buffer.from(hash(secret), "hex");
  const stored = Buffer.from(expected, "hex");
  return (
    stored.length === actual.length && crypto.timingSafeEqual(actual, stored)
  );
}

async function guestTask(req: Request, res: Response, result = false) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    failure(res, 404, "analysis_not_found");
    return null;
  }
  const task = await ResumeAnalysis.findById(req.params.id).select(
    `+secretHash${result ? " +result" : ""}`,
  );
  if (
    !task ||
    (task.expiresAt && task.expiresAt <= new Date()) ||
    !secretMatches(req.headers["x-analysis-secret"], task.secretHash)
  ) {
    failure(res, 404, "analysis_not_found");
    return null;
  }
  return task;
}

router.post(
  "/",
  createLimit,
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        failure(
          res,
          400,
          error instanceof multer.MulterError &&
            error.code === "LIMIT_FILE_SIZE"
            ? "file_too_large"
            : "invalid_file",
        );
        return;
      }
      next();
    });
  },
  async (req, res) => {
    try {
      getAiConfig();
    } catch {
      failure(res, 503, "not_configured");
      return;
    }
    const parsed = goalSchema.safeParse(req.body);
    if (!parsed.success) {
      failure(res, 400, "invalid_goal");
      return;
    }
    let source: {
      kind: "pdf" | "docx" | "text";
      name: string;
      data?: Buffer;
      text?: string;
    };
    if (req.file) {
      const file = req.file;
      if (!file.size) {
        failure(res, 400, "unreadable_file");
        return;
      }
      const extension = file.originalname.split(".").pop()?.toLowerCase();
      if (
        extension === "pdf" &&
        file.buffer.subarray(0, 5).toString() === "%PDF-"
      ) {
        source = { kind: "pdf", name: "resume.pdf", data: file.buffer };
      } else if (
        extension === "docx" &&
        file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
      ) {
        try {
          const text = await readDocx(file.buffer);
          // Persist extracted text instead of the archive: retries do not decompress twice.
          source = { kind: "text", name: "resume.docx", text };
        } catch {
          failure(res, 400, "unreadable_file");
          return;
        }
      } else {
        failure(res, 400, "invalid_file");
        return;
      }
    } else {
      const text = z
        .string()
        .trim()
        .min(30)
        .max(80000)
        .safeParse(req.body.resumeText);
      if (!text.success) {
        failure(res, 400, "unreadable_file");
        return;
      }
      source = { kind: "text", name: "resume.txt", text: text.data };
    }
    // File preparation above can yield; check capacity only once it has finished.
    // Reserve before Mongo I/O so concurrent uploads cannot bypass the cap.
    const id = new mongoose.Types.ObjectId();
    if (!reserveAnalysis(String(id))) {
      failure(res, 429, "analysis_busy");
      return;
    }
    const secret = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    try {
      await ResumeAnalysis.create({
        _id: id,
        secretHash: hash(secret),
        status: "pending",
        goal: parsed.data,
        source,
        sourceExpiresAt: expiry,
        expiresAt: expiry,
      });
    } catch (error) {
      releaseAnalysis(String(id));
      throw error;
    }
    launchAnalysis(String(id));
    res.status(202).json({ id: String(id), secret, status: "pending" });
  },
);

router.get("/:id", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const task = await guestTask(req, res, true);
  if (!task) return;
  res.json({
    id: String(task._id),
    status: task.status,
    error: task.error,
    ...(task.status === "completed" && task.result
      ? { preview: publicPreview(task.result) }
      : {}),
  });
});

router.post("/:id/retry", createLimit, async (req, res) => {
  const task = await guestTask(req, res);
  if (!task) return;
  if (task.status !== "failed") {
    res.status(202).json({ status: task.status });
    return;
  }
  if (task.sourceExpiresAt <= new Date()) {
    failure(res, 410, "source_expired");
    return;
  }
  const id = String(task._id);
  if (!reserveAnalysis(id)) {
    failure(res, 429, "analysis_busy");
    return;
  }
  try {
    const updated = await ResumeAnalysis.findOneAndUpdate(
      { _id: task._id, status: "failed" },
      { $set: { status: "pending" }, $unset: { error: 1 } },
    );
    if (updated) launchAnalysis(id);
    else releaseAnalysis(id);
  } catch (error) {
    releaseAnalysis(id);
    throw error;
  }
  res.status(202).json({ status: "pending" });
});

router.post("/:id/claim", authMiddleware, async (req: AuthRequest, res) => {
  const task = await guestTask(req, res);
  if (!task) return;
  const claimed = await ResumeAnalysis.findOneAndUpdate(
    { _id: task._id, $or: [{ ownerId: null }, { ownerId: req.user!.userId }] },
    {
      $set: { ownerId: req.user!.userId },
      $unset: { expiresAt: 1 },
    },
  );
  if (!claimed) {
    failure(res, 403, "analysis_forbidden");
    return;
  }
  res.json({ id: String(task._id) });
});

router.get(
  "/:id/full",
  authMiddleware,
  async (req: AuthRequest<{ id: string }>, res) => {
    res.set("Cache-Control", "no-store");
    if (!mongoose.isValidObjectId(req.params.id)) {
      failure(res, 404, "analysis_not_found");
      return;
    }
    const task = await ResumeAnalysis.findOne({
      _id: req.params.id,
      ownerId: req.user!.userId,
    }).select("+result");
    if (!task) {
      failure(res, 404, "analysis_not_found");
      return;
    }
    if (task.status !== "completed" || !task.result) {
      failure(res, 409, "analysis_not_ready");
      return;
    }
    if (req.query.download === "1") {
      res.set(
        "Content-Disposition",
        'attachment; filename="resume-analysis.json"',
      );
      res.type("application/json").send(JSON.stringify(task.result, null, 2));
    } else res.json(task.result);
  },
);

export default router;
