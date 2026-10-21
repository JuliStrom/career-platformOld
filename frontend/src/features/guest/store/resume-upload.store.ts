import { create } from 'zustand';
import type { ResumeFile } from '../model/analysis';
import {
  EMPTY_RESUME_FORM,
  type JobLocationPreference,
  type ResumeSourceType,
  type ResumeUploadForm,
} from '../model/types';
import {
  validateResumeForm,
  type ResumeValidationError,
} from '../lib/resume-validation';

interface ResumeUploadState {
  form: ResumeUploadForm;
  file: ResumeFile | null;
  errors: ResumeValidationError[];
  setSourceType: (sourceType: ResumeSourceType) => void;
  setFile: (file: ResumeFile) => void;
  setOutputLanguage: (language: 'original' | 'en') => void;
  setResumeText: (text: string) => void;
  setLinkedinUrl: (url: string) => void;
  setJobLocation: (location: JobLocationPreference) => void;
  setTargetCountry: (country: string) => void;
  setDesiredRole: (role: string) => void;
  setConsent: (consent: boolean) => void;
  /** Валидирует форму и возвращает true, если всё корректно. */
  validate: () => boolean;
  reset: () => void;
}

export const useResumeUploadStore = create<ResumeUploadState>((set, get) => ({
  form: EMPTY_RESUME_FORM,
  file: null,
  errors: [],

  setSourceType: (sourceType) =>
    set((state) => ({ form: { ...state.form, sourceType } })),

  setFile: (file) =>
    set((state) => ({
      file,
      form: { ...state.form, fileName: file.name, fileSize: file.size },
      errors: [],
    })),

  setResumeText: (resumeText) =>
    set((state) => ({ form: { ...state.form, resumeText } })),

  setLinkedinUrl: (linkedinUrl) =>
    set((state) => ({ form: { ...state.form, linkedinUrl } })),

  setJobLocation: (jobLocation) =>
    set((state) => ({ form: { ...state.form, jobLocation } })),

  setTargetCountry: (targetCountry) =>
    set((state) => ({ form: { ...state.form, targetCountry } })),

  setDesiredRole: (desiredRole) =>
    set((state) => ({ form: { ...state.form, desiredRole } })),
  setOutputLanguage: (outputLanguage) =>
    set((state) => ({ form: { ...state.form, outputLanguage } })),

  setConsent: (consent) =>
    set((state) => ({ form: { ...state.form, consent } })),

  validate: () => {
    const result = validateResumeForm(get().form);
    set({ errors: result.errors });
    return result.valid;
  },

  reset: () => set({ form: EMPTY_RESUME_FORM, file: null, errors: [] }),
}));
