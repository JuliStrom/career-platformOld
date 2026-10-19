import { create } from 'zustand';
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
  errors: ResumeValidationError[];
  setSourceType: (sourceType: ResumeSourceType) => void;
  setFile: (fileName: string, fileSize: number) => void;
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
  errors: [],

  setSourceType: (sourceType) =>
    set((state) => ({ form: { ...state.form, sourceType } })),

  setFile: (fileName, fileSize) =>
    set((state) => ({
      form: { ...state.form, fileName, fileSize },
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

  setConsent: (consent) =>
    set((state) => ({ form: { ...state.form, consent } })),

  validate: () => {
    const result = validateResumeForm(get().form);
    set({ errors: result.errors });
    return result.valid;
  },

  reset: () => set({ form: EMPTY_RESUME_FORM, errors: [] }),
}));
