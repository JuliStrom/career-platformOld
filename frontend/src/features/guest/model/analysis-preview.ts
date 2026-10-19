export type ResumeLevel = 'weak' | 'average' | 'strong';

export function getResumeLevel(score: number): ResumeLevel {
  if (score < 40) return 'weak';
  if (score < 70) return 'average';
  return 'strong';
}

// UI fixture until the guest analysis API is connected. Never present as a real analysis.
export const DEMO_ANALYSIS_PREVIEW = {
  score: 62,
  totalJobs: 30,
  problems: ['impact', 'focus'],
  jobs: [
    {
      id: 'product',
      company: 'Northstar',
      salary: '$3 000–4 500',
      tags: ['React', 'TypeScript', 'REST API'],
    },
    {
      id: 'platform',
      company: 'Orbit',
      salary: '$3 500–5 000',
      tags: ['TypeScript', 'Next.js', 'Testing'],
    },
    {
      id: 'web',
      company: 'Bright Labs',
      salary: '$2 800–4 000',
      tags: ['React', 'CSS', 'Git'],
    },
  ],
} as const;
