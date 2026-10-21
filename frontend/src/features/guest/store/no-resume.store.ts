import { create } from 'zustand';
import type { JobLocationPreference } from '../model/types';

export const experienceFields = [
  'company',
  'role',
  'start',
  'end',
  'duties',
  'achievements',
] as const;
type Experience = Record<(typeof experienceFields)[number], string> & {
  id: number;
};
export const emptyExperience = (id: number): Experience => ({
  id,
  company: '',
  role: '',
  start: '',
  end: '',
  duties: '',
  achievements: '',
});
type Draft = {
  role: string;
  skills: string;
  education: string;
  languages: string;
  location: string;
  targetCountry: string;
  jobLocation: JobLocationPreference;
  noExperience: boolean;
  experience: Experience[];
  consent: boolean;
};
// Keep the draft across navigation; GuestSessionBridge handles persistence.
export const useNoResumeStore = create<{
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
}>((set) => ({
  draft: {
    role: '',
    skills: '',
    education: '',
    languages: '',
    location: '',
    targetCountry: '',
    jobLocation: 'home',
    noExperience: false,
    experience: [emptyExperience(1)],
    consent: false,
  },
  update: (patch) => set(({ draft }) => ({ draft: { ...draft, ...patch } })),
}));
