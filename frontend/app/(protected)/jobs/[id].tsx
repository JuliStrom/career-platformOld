import { analytics } from '@/features/analytics/lib/track';
import type { Job } from '@/features/jobs/model';
import { useJobsStore } from '@/features/jobs/store';
import { JobDetailsView } from '@/features/jobs/ui/JobDetailsView';
import { fetchSimilarJobs } from '@/features/jobs/utils/similar-jobs.utils';
import { useProfileStore } from '@/features/profile/store/profile-store';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

/** Сегменты SPA, которые не являются id вакансии: /jobs/profile → иначе уходит GET /api/jobs/profile и 400. */
const REDIRECT_FROM_JOBS_ID: Record<string, string> = {
  profile: '/profile',
  recommendations: '/recommendations',
  admin: '/admin',
};

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const fetchProfile = useProfileStore((state) => state.fetchProfile);
  const {
    selectedJob,
    isLoading,
    error,
    favoriteJobs,
    fetchJobById,
    resetSelectedJob,
    fetchFavoriteJobs,
    addToFavorites,
    removeFromFavorites,
    isTogglingFavorite,
  } = useJobsStore();
  const { t } = useTranslation('jobs');
  const router = useRouter();
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);

  const redirectPath = useMemo(() => {
    if (!id) return null;
    return REDIRECT_FROM_JOBS_ID[id.toLowerCase()] ?? null;
  }, [id]);

  useEffect(() => {
    if (redirectPath) {
      router.replace(redirectPath as Href);
    }
  }, [redirectPath, router]);

  /** Всегда на список вакансий (router.back() часто возвращает на профиль из-за табов). */
  const handleBack = useCallback(() => {
    router.replace('/jobs');
  }, [router]);

  useEffect(() => {
    if (!id || redirectPath) {
      return () => {
        resetSelectedJob();
      };
    }

    analytics.jobViewed(id);
    fetchJobById(id);

    return () => {
      resetSelectedJob();
    };
  }, [id, redirectPath, fetchJobById, resetSelectedJob]);

  useEffect(() => {
    fetchFavoriteJobs();
    fetchProfile().catch(() => {
      // store already sets error
    });
  }, [fetchFavoriteJobs, fetchProfile]);

  useEffect(() => {
    if (!selectedJob || selectedJob._id !== id) {
      setSimilarJobs([]);
      return;
    }

    let cancelled = false;
    fetchSimilarJobs(selectedJob)
      .then((jobs) => {
        if (!cancelled) setSimilarJobs(jobs);
      })
      .catch(() => {
        if (!cancelled) setSimilarJobs([]);
      });

    return () => {
      cancelled = true;
    };
  }, [id, selectedJob]);

  const isFavorite = id ? favoriteJobs.some((j) => j._id === id) : false;

  function handleOpenJob(jobId: string) {
    router.push(`/jobs/${jobId}`);
  }

  if (redirectPath) {
    return null;
  }

  async function handleToggleFavorite(jobId: string = id ?? '') {
    if (!jobId) return;
    const currentlyFavorite = favoriteJobs.some((j) => j._id === jobId);
    try {
      if (currentlyFavorite) {
        await removeFromFavorites(jobId);
      } else {
        analytics.jobFavorited(jobId);
        await addToFavorites(jobId);
        await fetchFavoriteJobs();
      }
    } catch {
      // error already shown in store
    }
  }

  return (
    <JobDetailsView
      job={selectedJob}
      error={error}
      isLoading={isLoading || !id}
      onBack={handleBack}
      actions={
        <PrimaryButton
          onPress={() => void handleToggleFavorite()}
          disabled={isTogglingFavorite}
          isLoading={isTogglingFavorite}
          accessibilityLabel={
            isFavorite ? t('removeFromFavorites') : t('addToFavorites')
          }
          className={
            isFavorite ? 'bg-red-600 dark:bg-red-500' : undefined
          }
          style={isFavorite ? { backgroundColor: '#dc2626' } : undefined}
        >
          {isFavorite ? t('inFavorites') : t('addToFavorites')}
        </PrimaryButton>
      }
      similarJobs={similarJobs}
      onOpenJob={handleOpenJob}
      getIsFavorite={(jobId) => favoriteJobs.some((j) => j._id === jobId)}
      onToggleFavorite={(jobId) => void handleToggleFavorite(jobId)}
    />
  );
}
