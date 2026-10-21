import { z } from "zod";
import { Direction, Level } from "../types";

const text = z.string().max(12000);
export const goalSchema = z.object({
  jobLocation: z.enum(["home", "abroad"]),
  targetCountry: z.string().trim().min(1).max(120),
  desiredRole: z.string().trim().max(160).default(""),
  outputLanguage: z.enum(["original", "en"]).default("original"),
  responseLanguage: z.enum(["ru", "en"]).default("ru"),
  consent: z.literal("true"),
});
export type AnalysisGoal = z.infer<typeof goalSchema>;

export const profileSchema = z.object({
  name: z.string().trim().max(100).nullable().default(null),
  role: text.nullable(),
  direction: z.enum(Direction).nullable(),
  level: z.enum(Level).nullable(),
  location: text.nullable(),
  experience: z
    .array(
      z.object({
        company: text.nullable(),
        role: text.nullable(),
        startDate: text.nullable(),
        endDate: text.nullable(),
        responsibilities: z.array(text),
        achievements: z.array(text),
      }),
    )
    .max(40),
  skills: z.array(text).max(150),
  education: z
    .array(
      z.object({
        institution: text.nullable(),
        degree: text.nullable(),
        dates: text.nullable(),
      }),
    )
    .max(30),
  languages: z
    .array(z.object({ language: text, level: text.nullable() }))
    .max(30),
});
export const extractionSchema = z.object({
  isResume: z.boolean(),
  extractedText: z.string().max(80000),
  language: z.string().max(40),
  profile: profileSchema,
});
const criterion = (max: number) =>
  z.object({ score: z.number().int().min(0).max(max), explanation: text });
export const evaluationSchema = z.object({
  criteria: z.object({
    goalFit: criterion(25),
    experience: criterion(30),
    skills: criterion(20),
    structure: criterion(15),
    completeness: criterion(10),
  }),
  problems: z.array(z.object({ title: text, explanation: text })).length(2),
  strengths: z.array(text).max(20),
  recommendations: z.array(text).max(30),
  questions: z.array(text).max(30),
  improvedResume: z.object({
    language: z.string().max(40),
    sections: z.array(z.object({ title: text, content: text })).max(30),
    markdown: z.string().max(60000),
  }),
});

export type ExtractedResume = z.infer<typeof extractionSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;

export function resumeLevel(score: number) {
  return score < 40 ? "weak" : score < 70 ? "average" : "strong";
}

export function publicPreview(result: Record<string, any>) {
  // Explicit allowlist: never spread the private result into a guest response.
  return {
    score: result.score,
    level: result.level,
    problems: result.problems,
    jobs: result.jobs.slice(0, 3),
    totalJobs: result.jobs.length,
  };
}
