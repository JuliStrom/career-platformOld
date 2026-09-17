import { useAuthStore } from '@/features/auth/store/auth.store';
import { useNotificationsStore } from '@/features/notifications/store/notifications-store';
import { surfaceColor } from '@/shared/config/theme/colors';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { UserType } from '@/shared/model';
import { AppHeader } from '@/shared/ui';
import { FullScreenLoader } from '@/src/shared/ui/common/FullScreenLoader';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, Tabs, type Href, useRootNavigationState } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

export default function ProtectedLayout() {
  const rootNavigationState = useRootNavigationState();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#111827' : '#f9fafb';
  const { t: tCommon } = useTranslation('common');
  const { t: tProfile } = useTranslation('profile');
  const { t: tJobs } = useTranslation('jobs');
  const { t: tCareer } = useTranslation('career');
  const { t: tEmployer } = useTranslation('employer');

  const insets = useSafeAreaInsets();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const revalidateSession = useAuthStore((state) => state.revalidateSession);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isLoading = useAuthStore((state) => state.isLoading);
  const userType = useAuthStore((state) => state.user?.userType);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const fetchNotifications = useNotificationsStore(
    (state) => state.fetchNotifications
  );
  const [isChecking, setIsChecking] = useState(true);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    revalidateSession().then((valid) => {
      if (cancelled) return;
      setSessionValid(valid);
      setIsChecking(false);
    });

    return () => {
      cancelled = true;
    };
  }, [revalidateSession]);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchNotifications();
    }
  }, [fetchNotifications, isAuthenticated]);

  if (!rootNavigationState?.key) {
    return <FullScreenLoader />;
  }

  if (isInitializing || isChecking || isLoading) {
    return <FullScreenLoader />;
  }

  if (sessionValid === false || !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!userType) {
    return <Redirect href="/choose-path" />;
  }

  const isEmployer = userType === UserType.EMPLOYER;

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
        <Tabs
          initialRouteName={isEmployer ? 'employer/index' : 'jobs/index'}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor },
            tabBarActiveTintColor: isDark ? '#60a5fa' : '#2563eb',
            tabBarInactiveTintColor: isDark ? '#9ca3af' : '#6b7280',
            tabBarStyle: {
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              borderTopColor: isDark ? '#374151' : '#e5e7eb',
            },
          }}
        >
          <Tabs.Screen
            name="employer/index"
            options={{
              title: tEmployer('tabs.specialists'),
              tabBarLabel: tEmployer('tabs.specialists'),
              href: isEmployer ? ('/employer' as Href) : null,
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="groups" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="employer/profile"
            options={{
              title: tEmployer('tabs.company'),
              tabBarLabel: tEmployer('tabs.company'),
              href: isEmployer ? ('/employer/profile' as Href) : null,
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons
                  name="business-center"
                  size={size}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="employer/jobs/index"
            options={{
              title: tEmployer('tabs.jobs'),
              tabBarLabel: tEmployer('tabs.jobs'),
              href: isEmployer ? ('/employer/jobs' as Href) : null,
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="work-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="jobs/index"
            options={{
              title: tJobs('listTitle'),
              tabBarLabel: tCommon('tabJobs'),
              href: isEmployer ? null : '/jobs',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="work-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="jobs/favorites"
            options={{
              title: tJobs('favoritesTitle'),
              tabBarLabel: tCommon('tabFavorites'),
              href: isEmployer ? null : ('/jobs/favorites' as Href),
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="favorite" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile/index"
            options={{
              title: tProfile('title'),
              tabBarLabel: tCommon('tabProfile'),
              href: isEmployer ? null : '/profile',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="person" size={size} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="education/index"
            options={{
              title: tCommon('educations.mainTitle'),
              tabBarLabel: tCommon('tabEducation'),
              href: isEmployer ? null : ('/education' as never),
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="school" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="recommendations/index"
            options={{
              title: tCareer('recommendations.title'),
              tabBarLabel: tCommon('tabRecommendations'),
              href: isEmployer ? null : '/recommendations',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons
                  name="lightbulb-outline"
                  size={size}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="notifications/index"
            options={{
              title: tCommon('tabNotifications'),
              tabBarLabel: tCommon('tabNotifications'),
              href: '/notifications' as never,
              tabBarBadge:
                unreadCount > 0
                  ? unreadCount > 99
                    ? '99+'
                    : unreadCount
                  : undefined,
              tabBarBadgeStyle: {
                backgroundColor: '#ef4444',
                color: '#ffffff',
              },
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons
                  name={
                    unreadCount > 0 ? 'notifications' : 'notifications-none'
                  }
                  size={size}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="profile/edit"
            options={{
              title: tProfile('editProfile'),
              href: null,
            }}
          />
          <Tabs.Screen
            name="profile/create"
            options={{
              title: tProfile('createProfile'),
              href: null,
            }}
          />
          <Tabs.Screen
            name="career-abroad"
            options={{
              title: tProfile('careerAbroad.title'),
              href: null,
            }}
          />
          <Tabs.Screen
            name="jobs/[id]"
            options={{
              title: tJobs('detailsTitle'),
              href: null,
            }}
          />
          <Tabs.Screen
            name="employer/jobs/create"
            options={{
              title: tEmployer('jobs.create'),
              href: null,
            }}
          />
          <Tabs.Screen
            name="employer/jobs/[id]"
            options={{
              title: tEmployer('jobs.details'),
              href: null,
            }}
          />
          <Tabs.Screen
            name="employer/jobs/[id]/edit"
            options={{
              title: tEmployer('jobs.edit'),
              href: null,
            }}
          />
          <Tabs.Screen
            name="recommendations/[id]"
            options={{
              title: tCareer('recommendations.title'),
              href: null,
            }}
          />
          <Tabs.Screen
            name="recommendations/roadmap"
            options={{
              title: tCareer('roadmap.title'),
              href: null,
            }}
          />
          <Tabs.Screen
            name="career-change/index"
            options={{
              title: tCareer('careerChangeHub.title'),
              href: null,
            }}
          />
        </Tabs>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
