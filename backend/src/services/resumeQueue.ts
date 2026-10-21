import ResumeAnalysis from "../models/ResumeAnalysis";
import GuestSession from '../models/GuestSession';
import { extractResume, evaluateResume, AnalysisError } from "./resumeAi";
import { matchResumeJobs } from "./resumeMatching";
import { resumeLevel } from "../schemas/resumeAnalysis";

const active = new Set<string>();
export const canStartAnalysis = () => active.size < 2;
export function reserveAnalysis(id: string) {
  if (active.has(id) || !canStartAnalysis()) return false;
  active.add(id);
  return true;
}
export const releaseAnalysis = (id: string) => active.delete(id);

export async function cleanResumeSources() {
  const now = new Date();
  await ResumeAnalysis.updateMany(
    { ownerId: null, sourceExpiresAt: { $lte: now }, source: { $exists: true } },
    { $unset: { source: 1 } },
  );
  await ResumeAnalysis.deleteMany({ ownerId: null, expiresAt: { $lte: now } });
  await GuestSession.deleteMany({ ownerId: null, expiresAt: { $lte: now } });
}

export async function initializeResumeQueue() {
  await ResumeAnalysis.updateMany(
    { status: { $in: ["pending", "reading", "evaluating", "matching"] } },
    {
      $set: { status: "failed", error: "server_restarted" },
    },
  );
  await cleanResumeSources();
  setInterval(() => {
    cleanResumeSources().catch(() => console.error("Resume cleanup failed"));
  }, 60_000).unref();
}

export async function runAnalysis(id: string) {
  // Called only after the route reserves capacity synchronously.
  const controller = new AbortController();
  try {
    const task = await ResumeAnalysis.findById(id).select("+source");
    if (!task?.source) throw new AnalysisError("source_expired");
    await ResumeAnalysis.updateOne(
      { _id: id },
      { $set: { status: "reading" }, $unset: { error: 1 } },
    );
    const extracted = await extractResume(task.source, controller.signal);
    await ResumeAnalysis.updateOne(
      { _id: id },
      { $set: { status: "evaluating" } },
    );
    const evaluated = await evaluateResume(
      extracted.value,
      task.goal,
      controller.signal,
    );
    if (controller.signal.aborted) throw new AnalysisError("analysis_timeout");
    await ResumeAnalysis.updateOne(
      { _id: id },
      { $set: { status: "matching" } },
    );
    const jobs = await matchResumeJobs(extracted.value.profile, task.goal);
    if (controller.signal.aborted) throw new AnalysisError("analysis_timeout");
    const score = Object.values(evaluated.value.criteria).reduce(
      (sum, criterion) => sum + criterion.score,
      0,
    );
    const { isResume: _, ...resume } = extracted.value;
    const result = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      models: { extraction: extracted.model, evaluation: evaluated.model },
      goal: task.goal,
      ...resume,
      ...evaluated.value,
      score,
      level: resumeLevel(score),
      jobs,
      totalJobs: jobs.length,
    };
    await ResumeAnalysis.updateOne(
      { _id: id },
      { $set: { status: "completed", result } },
    );
  } catch (error) {
    if (error instanceof AnalysisError && error.upstreamStatus) {
      // Only operational metadata: never log keys, source documents or model output.
      console.error("Resume AI request failed", {
        code: error.code,
        status: error.upstreamStatus,
        provider: process.env.AI_PROVIDER || (process.env.GROQ_API_KEY ? "groq" : "openrouter"),
      });
    }
    const code = controller.signal.aborted
      ? "analysis_timeout"
      : error instanceof AnalysisError
        ? error.code
        : "processing_failed";
    await ResumeAnalysis.updateOne(
      { _id: id },
      { $set: { status: "failed", error: code } },
    ).catch(() => console.error("Resume task update failed"));
  } finally {
    active.delete(id);
  }
}

export function launchAnalysis(id: string) {
  active.add(id);
  void runAnalysis(id);
}
