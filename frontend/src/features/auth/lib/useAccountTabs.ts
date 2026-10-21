import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import type MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';

type Icon = ComponentProps<typeof MaterialIcons>['name'];
type AccountTab = {
  name: string;
  href: Href | null;
  label: string;
  title: string;
  icon: Icon;
  previewIcon?: Icon;
  badge?: number | string;
};

/** One definition for account tabs and the menu below the resume analysis. */
export function useAccountTabs(
  isEmployer: boolean,
  unreadCount = 0
): AccountTab[] {
  const { t } = useTranslation('common');
  const { t: profile } = useTranslation('profile');
  const { t: jobs } = useTranslation('jobs');
  const { t: career } = useTranslation('career');
  const { t: employer } = useTranslation('employer');
  const { t: guest } = useTranslation('guest');
  return [
    {
      name: 'employer/index',
      href: isEmployer ? '/employer' : null,
      title: employer('tabs.specialists'),
      label: employer('tabs.specialists'),
      icon: 'groups',
    },
    {
      name: 'employer/profile',
      href: isEmployer ? '/employer/profile' : null,
      title: employer('tabs.company'),
      label: employer('tabs.company'),
      icon: 'business-center',
    },
    {
      name: 'employer/jobs/index',
      href: isEmployer ? '/employer/jobs' : null,
      title: employer('tabs.jobs'),
      label: employer('tabs.jobs'),
      icon: 'work-outline',
    },
    {
      name: 'jobs/index',
      href: isEmployer ? null : '/jobs',
      title: jobs('listTitle'),
      label: t('tabJobs'),
      icon: 'work-outline',
    },
    {
      name: 'jobs/favorites',
      href: isEmployer ? null : '/jobs/favorites',
      title: jobs('favoritesTitle'),
      label: t('tabFavorites'),
      icon: 'favorite',
      previewIcon: 'favorite-border',
    },
    {
      name: 'profile/index',
      href: isEmployer ? null : '/profile',
      title: profile('title'),
      label: t('tabProfile'),
      icon: 'person',
      previewIcon: 'person-outline',
    },
    {
      name: 'education/index',
      href: isEmployer ? null : '/education',
      title: t('educations.mainTitle'),
      label: t('tabEducation'),
      icon: 'school',
    },
    {
      name: 'recommendations/index',
      href: isEmployer ? null : '/recommendations',
      title: career('recommendations.title'),
      label: t('tabRecommendations'),
      icon: 'lightbulb-outline',
    },
    {
      name: 'notifications/index',
      href: '/notifications',
      title: t('tabNotifications'),
      label: t('tabNotifications'),
      icon: unreadCount > 0 ? 'notifications' : 'notifications-none',
      badge: unreadCount > 99 ? '99+' : unreadCount || undefined,
    },
    {
      name: 'resume-history',
      href: '/resume-history',
      title: guest('history.title'),
      label: guest('history.title'),
      icon: 'history',
    },
  ];
}
