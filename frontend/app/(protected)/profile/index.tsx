import { useAuthStore } from '@/features/auth/store/auth.store';
import { useJobsStore } from '@/features/jobs/store';
import { useProfileStore } from '@/features/profile/store/profile-store';
import { SpecialistProfile } from '@/features/profile/ui/SpecialistProfile';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { UserRole, UserType } from '@/shared/model';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { FullScreenLoader } from '@/src/shared/ui';
import { Redirect, type Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const profile = useProfileStore((state) => state.profile);
  const isLoading = useProfileStore((state) => state.isLoading);
  const fetchProfile = useProfileStore((state) => state.fetchProfile);
  const resetProfile = useProfileStore((state) => state.resetProfile);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const resetFavorites = useJobsStore((state) => state.resetFavorites);
  const authIsLoading = useAuthStore((state) => state.isLoading);
  const { t: tCommon } = useTranslation('common');
  const { t: tAuth } = useTranslation('auth');
  const { t: tProfile } = useTranslation('profile');
  const { t: tJobs } = useTranslation('jobs');
  const { t: tCareer } = useTranslation('career');
  const userRole = useAuthStore((state) => state.user?.role);
  const userType = useAuthStore((state) => state.user?.userType);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || userType === UserType.EMPLOYER) {
      return;
    }
    fetchProfile().catch(() => {
      // store already sets error
    });
  }, [fetchProfile, isAuthenticated, userType]);

  if (userType === UserType.EMPLOYER) {
    return <Redirect href={'/employer' as Href} />;
  }

  async function handleLogout() {
    resetFavorites();
    resetProfile();
    await logout();
    router.replace('/(auth)/login');
  }

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!profile) {
    return (
      <SafeAreaView
        className="flex-1 bg-gray-50 dark:bg-gray-900"
        edges={['top', 'bottom']}
      >
        <View className="flex-1 items-center justify-center px-8">
          <Text
            className="mb-6 text-center text-lg text-gray-600 dark:text-gray-400"
            accessibilityLabel={tProfile('noProfile')}
          >
            {tProfile('noProfile')}
          </Text>
          <PrimaryButton
            onPress={() => router.push('/profile/create')}
            accessibilityLabel={tProfile('createProfileButton')}
          >
            {tProfile('createProfileButton')}
          </PrimaryButton>
        </View>
      </SafeAreaView>
    );
  }

  const actions = (
    <>
      {profile.careerChangeTrackActive ? (
        <PrimaryButton
          onPress={() => router.push('/career-change' as Href)}
          accessibilityLabel={tProfile('careerChange.hubButton')}
          className="mt-3"
        >
          {tProfile('careerChange.hubButton')}
        </PrimaryButton>
      ) : null}
      {userRole === UserRole.ADMIN && (
        <PrimaryButton
          onPress={() => router.push('/admin')}
          accessibilityLabel={tCommon('adminPanel')}
          className="mt-3"
        >
          {tCommon('adminPanel')}
        </PrimaryButton>
      )}
      <PrimaryButton
        onPress={() => router.push('/career-abroad')}
        accessibilityLabel={tProfile('careerAbroad.button')}
        className="mt-3"
      >
        {tProfile('careerAbroad.button')}
      </PrimaryButton>
      <PrimaryButton
        onPress={() => router.push('/jobs')}
        accessibilityLabel={tJobs('openJobsButton')}
        className="mt-3"
      >
        {tJobs('openJobsButton')}
      </PrimaryButton>
      <PrimaryButton
        onPress={() => router.push('/education' as Href)}
        accessibilityLabel={tCommon('tabEducation')}
        className="mt-3"
      >
        {tCommon('tabEducation')}
      </PrimaryButton>
      <PrimaryButton
        onPress={() => router.push('/recommendations')}
        accessibilityLabel={tCareer('recommendations.title')}
        className="mt-3"
      >
        {tCareer('recommendations.title')}
      </PrimaryButton>
      <PrimaryButton
        onPress={handleLogout}
        isLoading={authIsLoading}
        accessibilityLabel={tAuth('logout.button')}
        className="mt-3 bg-red-500 dark:bg-red-600"
      >
        {tAuth('logout.button')}
      </PrimaryButton>
    </>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      edges={['top', 'bottom']}
    >
      <SpecialistProfile
        profile={profile}
        onEdit={() => router.push('/profile/edit')}
        actions={actions}
      />
    </SafeAreaView>
  );
}
