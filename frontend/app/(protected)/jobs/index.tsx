import { analytics } from '@/features/analytics/lib/track';
import { useProfileStore } from '@/features/profile/store/profile-store';
import { primaryProfileDirection } from '@/features/profile/utils/directions.utils';
import { useJobsStore } from '@/features/jobs/store';
import { JobsListView } from '@/features/jobs/ui/JobsListView';
import { useExitOrBack } from '@/shared/lib/hooks/useExitOrBack';
import { IconNavPressable } from '@/shared/ui';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';

export default function JobsListScreen() {
  const fetchProfile = useProfileStore((state) => state.fetchProfile);
  const profile = useProfileStore((state) => state.profile);
  const profileHydrated = useProfileStore((state) => state.profileHydrated);
  const {
    jobs,
    total,
    isLoading,
    error,
    filters,
    favoriteJobs,
    setFilters,
    resetFilters,
    fetchJobs,
    fetchFavoriteJobs,
    addToFavorites,
    removeFromFavorites,
  } = useJobsStore();
  const router = useRouter();
  const exitOrBack = useExitOrBack();
  const { t } = useTranslation('jobs');

  useEffect(() => {
    fetchProfile().catch(() => {
      // store already sets error
    });
  }, [fetchProfile]);

  useEffect(() => {
    analytics.jobsListOpened();
    fetchFavoriteJobs();
  }, [fetchFavoriteJobs]);

  useEffect(() => {
    if (!profileHydrated) return;

    const direction = primaryProfileDirection(profile?.directions);
    const level = profile?.level;
    if (direction || level) {
      setFilters({
        ...(direction ? { direction } : {}),
        ...(level ? { level } : {}),
      });
    } else {
      resetFilters();
    }
    void fetchJobs();
  }, [
    profileHydrated,
    profile?.directions,
    profile?.level,
    setFilters,
    resetFilters,
    fetchJobs,
  ]);

  function handleOpenJob(id: string) {
    router.push(`/jobs/${id}`);
  }

  function handleApplyFilters() {
    analytics.jobsFiltered(filters as unknown as Record<string, unknown>);
    fetchJobs();
  }

  function handleResetFilters() {
    resetFilters();
    fetchJobs();
  }

  async function handleToggleFavorite(id: string) {
    const isFavorite = favoriteJobs.some((j) => j._id === id);
    try {
      if (isFavorite) {
        await removeFromFavorites(id);
      } else {
        analytics.jobFavorited(id);
        await addToFavorites(id);
      }
    } catch {
      // error already shown in store
    }
  }

  return (
    <JobsListView
      jobs={jobs}
      total={total}
      isLoading={isLoading}
      error={error}
      filters={filters}
      onChangeFilters={setFilters}
      onApplyFilters={handleApplyFilters}
      onResetFilters={handleResetFilters}
      onOpenJob={handleOpenJob}
      headerRight={
        <>
          <IconNavPressable
            name="arrow-back"
            accessibilityLabel={t('back')}
            onPress={exitOrBack}
          />
          <IconNavPressable
            name="home"
            accessibilityLabel={t('goHome')}
            onPress={() => router.replace('/jobs')}
          />
          <IconNavPressable
            name="favorite"
            accessibilityLabel={t('favoritesLink')}
            onPress={() => router.push('/jobs/favorites')}
          />
        </>
      }
      getIsFavorite={(id) => favoriteJobs.some((j) => j._id === id)}
      onToggleFavorite={handleToggleFavorite}
    />
  );
}
