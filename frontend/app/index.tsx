import { useAuthStore } from '@/features/auth/store/auth.store';
import { GuestLandingScreen } from '@/features/guest/ui';
import { UserType } from '@/shared/model';
import { FullScreenLoader } from '@/src/shared/ui/common/FullScreenLoader';
import { Redirect, type Href, useRootNavigationState } from 'expo-router';

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const userType = useAuthStore((state) => state.user?.userType);

  if (!rootNavigationState?.key) {
    return <FullScreenLoader />;
  }

  if (isInitializing) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <GuestLandingScreen />;
  }

  if (!userType) {
    return <Redirect href="/choose-path" />;
  }

  return (
    <Redirect
      href={(userType === UserType.EMPLOYER ? '/employer' : '/jobs') as Href}
    />
  );
}
