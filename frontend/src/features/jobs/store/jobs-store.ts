import { handleApiError } from '@/shared/config/api';
import i18n from '@/shared/config/i18n';
import { showToast } from '@/shared/lib/toast';
import { create } from 'zustand';
import * as jobsApi from '../api';
import {
  CreateJobPayload,
  Job,
  IJobsFilters,
  JobsListResponse,
} from '../model';

interface JobsState {
  jobs: Job[];
  total: number;
  selectedJob: Job | null;
  filters: IJobsFilters;
  isLoading: boolean;
  isDeleting: boolean;
  isUpdating: boolean;
  error: string | null;

  favoriteJobs: Job[];
  favoriteJobsCount: number;
  isLoadingFavorites: boolean;
  isTogglingFavorite: boolean;

  setFilters: (partial: Partial<IJobsFilters>) => void;
  resetFilters: () => void;
  clearError: () => void;
  resetSelectedJob: () => void;
  fetchJobs: () => Promise<void>;
  fetchJobById: (id: string) => Promise<void>;
  createJob: (payload: CreateJobPayload) => Promise<Job>;
  updateJob: (id: string, payload: CreateJobPayload) => Promise<Job>;
  deleteJob: (id: string) => Promise<void>;

  fetchFavoriteJobs: () => Promise<void>;
  addToFavorites: (id: string) => Promise<void>;
  removeFromFavorites: (id: string) => Promise<void>;
  resetFavorites: () => void;
}

const defaultFilters: IJobsFilters = { limit: 100 };

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  total: 0,
  selectedJob: null,
  filters: defaultFilters,
  isLoading: false,
  isDeleting: false,
  isUpdating: false,
  error: null,

  favoriteJobs: [],
  favoriteJobsCount: 0,
  isLoadingFavorites: false,
  isTogglingFavorite: false,

  setFilters: (partial) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...partial,
      },
    })),

  resetFilters: () => set({ filters: defaultFilters }),

  clearError: () => set({ error: null }),

  resetSelectedJob: () => set({ selectedJob: null }),

  fetchJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      const f = get().filters;
      const searchTrimmed = f.search?.trim();
      const filters: IJobsFilters = {
        ...f,
        search: searchTrimmed || undefined,
      };
      const { jobs, total }: JobsListResponse = await jobsApi.getJobs(filters);
      set({ jobs, total, isLoading: false });
    } catch (error) {
      const message = handleApiError(error);
      set({ error: message, isLoading: false });
    }
  },

  fetchJobById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const job = await jobsApi.getJobById(id);
      set({ selectedJob: job, isLoading: false });
    } catch (error) {
      const message = handleApiError(error);
      set({ error: message, isLoading: false });
    }
  },

  createJob: async (payload: CreateJobPayload) => {
    set({ isLoading: true, error: null });
    try {
      const job = await jobsApi.createJob(payload);
      set({ isLoading: false });
      return job;
    } catch (error) {
      const message = handleApiError(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateJob: async (id: string, payload: CreateJobPayload) => {
    set({ isUpdating: true, error: null });
    try {
      const job = await jobsApi.updateJob(id, payload);
      const { jobs, selectedJob } = get();
      const updatedJobs = jobs.map((j) => (j._id === id ? job : j));
      set({
        jobs: updatedJobs,
        selectedJob: selectedJob?._id === id ? job : selectedJob,
        isUpdating: false,
      });
      return job;
    } catch (error) {
      const message = handleApiError(error);
      set({ error: message, isUpdating: false });
      throw error;
    }
  },

  deleteJob: async (id: string) => {
    set({ isDeleting: true, error: null });
    try {
      await jobsApi.deleteJob(id);
      const { jobs, total, selectedJob } = get();
      set({
        jobs: jobs.filter((j) => j._id !== id),
        total: Math.max(0, total - 1),
        selectedJob: selectedJob?._id === id ? null : selectedJob,
        isDeleting: false,
      });
    } catch (error) {
      const message = handleApiError(error);
      set({ error: message, isDeleting: false });
      throw error;
    }
  },

  fetchFavoriteJobs: async () => {
    set({ isLoadingFavorites: true, error: null });
    try {
      const { total, favoriteJobs } = await jobsApi.getFavoriteJobs();
      set({
        favoriteJobs,
        favoriteJobsCount: total,
        isLoadingFavorites: false,
      });
    } catch (error) {
      const message = handleApiError(error);
      set({ error: message, isLoadingFavorites: false });
    }
  },

  addToFavorites: async (id: string) => {
    set({ isTogglingFavorite: true, error: null });
    try {
      const { favoriteJobsCount } = await jobsApi.addJobToFavorites(id);
      const { selectedJob, jobs, favoriteJobs } = get();
      const job =
        selectedJob?._id === id ? selectedJob : jobs.find((j) => j._id === id);
      const updatedFavorites =
        favoriteJobs.some((j) => j._id === id) || !job
          ? favoriteJobs
          : [...favoriteJobs, job];
      set({
        favoriteJobs: updatedFavorites,
        favoriteJobsCount,
        isTogglingFavorite: false,
      });
      showToast({
        message: i18n.t('jobs:addedToFavorites'),
        actionLabel: i18n.t('jobs:favoritesLink'),
        actionHref: '/jobs/favorites',
      });
    } catch (error) {
      const message = handleApiError(error);
      set({ error: message, isTogglingFavorite: false });
      throw error;
    }
  },

  removeFromFavorites: async (id: string) => {
    set({ isTogglingFavorite: true, error: null });
    try {
      const { favoriteJobsCount } = await jobsApi.removeJobFromFavorites(id);
      set({
        favoriteJobs: get().favoriteJobs.filter((j) => j._id !== id),
        favoriteJobsCount,
        isTogglingFavorite: false,
      });
    } catch (error) {
      const message = handleApiError(error);
      set({ error: message, isTogglingFavorite: false });
      throw error;
    }
  },

  resetFavorites: () =>
    set({
      favoriteJobs: [],
      favoriteJobsCount: 0,
    }),
}));
