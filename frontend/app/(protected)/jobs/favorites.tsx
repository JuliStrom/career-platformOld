import { useJobsStore } from '@/features/jobs/store';
import { JobItem } from '@/features/jobs/ui';
import { useProfileStore } from '@/features/profile/store/profile-store';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { useExitOrBack } from '@/shared/lib/hooks/useExitOrBack';
import { IconNavPressable } from '@/shared/ui';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
  const profile = useProfileStore((state) => state.profile);
  const {
    favoriteJobs,
    favoriteJobsCount,
    isLoadingFavorites,
    error,
    fetchFavoriteJobs,
    removeFromFavorites,
  } = useJobsStore();
  const { t } = useTranslation('jobs');
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const tabBarMuted = isDark ? '#9ca3af' : '#6b7280';
  const router = useRouter();
  const exitOrBack = useExitOrBack();

  useEffect(() => {
    if (profile) {
      fetchFavoriteJobs();
    }
  }, [profile, fetchFavoriteJobs]);

  const backgroundColor = colorScheme === 'dark' ? '#111827' : '#f9fafb';

  function handleOpenJob(id: string) {
    router.push(`/jobs/${id}`);
  }

  async function handleRemoveFromFavorites(id: string) {
    try {
      await removeFromFavorites(id);
    } catch {
      // Ошибка уже обрабатывается в store
    }
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor }}
      edges={['top', 'bottom']}
    >
      <View className="flex-1 px-4 pb-4 pt-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('favoritesTitle')}
          </Text>
          <View className="flex-row items-center gap-2">
            <IconNavPressable
              name="arrow-back"
              accessibilityLabel={t('back')}
              onPress={exitOrBack}
            />
            <IconNavPressable
              name="home"
              accessibilityLabel={t('goHome')}
              onPress={() => router.replace('/profile')}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('listTitle')}
              onPress={() => router.replace('/jobs')}
              className="rounded-lg p-2 active:opacity-70 dark:active:opacity-80"
            >
              <MaterialIcons
                name="work-outline"
                size={24}
                color={tabBarMuted}
              />
            </Pressable>
          </View>
        </View>

        {error && (
          <View className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/40">
            <Text className="text-sm text-red-700 dark:text-red-300">
              {error}
            </Text>
          </View>
        )}

        <View className="flex-1">
          <FlatList
            data={favoriteJobs}
            keyExtractor={(item) => item._id}
            refreshing={isLoadingFavorites}
            onRefresh={fetchFavoriteJobs}
            ListEmptyComponent={
              !isLoadingFavorites ? (
                <View className="mt-10 items-center">
                  <Text className="text-gray-500 dark:text-gray-400">
                    {t('favoritesEmpty')}
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <JobItem
                handleOpenJob={handleOpenJob}
                item={item}
                t={t}
                isFavorite={true}
                onToggleFavorite={handleRemoveFromFavorites}
              />
            )}
          />
        </View>

        {favoriteJobsCount > 0 && (
          <View className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
            <Text className="text-center text-xs text-gray-500 dark:text-gray-400">
              {t('total', { count: favoriteJobsCount })}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
