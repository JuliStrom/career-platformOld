export interface AnalysisAccess {
  id: string;
  secret: string;
}
export type AnalysisStatus =
  | 'pending'
  | 'reading'
  | 'evaluating'
  | 'matching'
  | 'completed'
  | 'failed';
export interface MatchedJob {
  id: string;
  title: string;
  company: string;
  description: string;
  direction: string;
  level: string;
  workFormat: string;
  location: string;
  salary?: { min?: number; max?: number; currency?: string };
  requirements: string[];
  responsibilities: string[];
  matchScore: number;
  matchedSkills: string[];
  locationNeedsConfirmation: boolean;
}
export interface AnalysisPreview {
  score: number;
  level: 'weak' | 'average' | 'strong';
  problems: { title: string; explanation: string }[];
  jobs: MatchedJob[];
  totalJobs: number;
}
export interface FullAnalysis extends AnalysisPreview {
  schemaVersion: number;
  language: string;
  extractedText: string;
  profile: {
    name?: string | null;
    role: string | null;
    direction: string | null;
    level: string | null;
    location: string | null;
    experience: {
      company: string | null;
      role: string | null;
      startDate: string | null;
      endDate: string | null;
      responsibilities: string[];
      achievements: string[];
    }[];
    skills: string[];
    education: {
      institution: string | null;
      degree: string | null;
      dates: string | null;
    }[];
    languages: { language: string; level: string | null }[];
  };
  criteria: Record<string, { score: number; explanation: string }>;
  strengths: string[];
  recommendations: string[];
  questions: string[];
  improvedResume: {
    language: string;
    sections: { title: string; content: string }[];
    markdown: string;
  };
}
export interface AnalysisResponse {
  id: string;
  status: AnalysisStatus;
  error?: string;
  preview?: AnalysisPreview;
}
export interface ResumeFile {
  name: string;
  size: number;
  uri?: string;
  file?: File;
  mimeType: string;
}
