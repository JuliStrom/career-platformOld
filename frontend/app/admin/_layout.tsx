import { useAuthStore } from '@/features/auth/store/auth.store';
import { surfaceColor } from '@/shared/config/theme/colors';
import { AppHeader } from '@/shared/ui';
import { FullScreenLoader } from '@/src/shared/ui/common/FullScreenLoader';
import { Redirect, Stack, useRootNavigationState } from 'expo-router';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

export default function AdminLayout() {
  const rootNavigationState = useRootNavigationState();
  const { colorScheme } = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#111827' : '#f9fafb';
  const insets = useSafeAreaInsets();

  const user = useAuthStore((state) => state.user);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (!rootNavigationState?.key) {
    return <FullScreenLoader />;
  }

  if (isInitializing || isLoading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Redirect href="/" />;
  }

  if (user.role !== 'ADMIN') {
    return <Redirect href="/profile" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: surfaceColor('header', colorScheme),
        }}
      >
        <AppHeader />
      </View>
      {/* Отступ сверху уже съеден хедером — экраны не должны добавлять его повторно. */}
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor,
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="invites/index" />
          <Stack.Screen name="invites/create" />
          <Stack.Screen name="education/index" />
          <Stack.Screen name="education/create" />
          <Stack.Screen name="education/[id]/edit" />
          <Stack.Screen name="career-routes/index" />
          <Stack.Screen name="career-routes/create" />
          <Stack.Screen name="career-routes/[id]/edit" />
          <Stack.Screen name="companies/index" />
          <Stack.Screen name="companies/create" />
          <Stack.Screen name="companies/[id]/edit" />
          <Stack.Screen name="ai-risk-index/index" />
          <Stack.Screen name="ai-risk-index/create" />
          <Stack.Screen name="ai-risk-index/[id]/edit" />
          <Stack.Screen name="career-triggers/index" />
          <Stack.Screen name="career-triggers/create" />
          <Stack.Screen name="career-triggers/[id]/edit" />
          <Stack.Screen name="career-roadmaps/index" />
          <Stack.Screen name="career-roadmaps/create" />
          <Stack.Screen name="career-roadmaps/[id]/edit" />
          <Stack.Screen name="users/index" />
          <Stack.Screen name="jobs/index" />
          <Stack.Screen name="jobs/create" />
          <Stack.Screen name="jobs/[id]" />
          <Stack.Screen name="jobs/[id]/edit" />
          <Stack.Screen name="recommendations/index" />
          <Stack.Screen name="recommendations/create" />
          <Stack.Screen name="recommendations/[id]" />
          <Stack.Screen name="recommendations/[id]/edit" />
          <Stack.Screen name="analytics/index" />
        </Stack>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
