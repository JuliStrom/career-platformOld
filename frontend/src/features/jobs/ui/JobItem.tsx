import type { Job } from '@/features/jobs/model';
import {
  formatJobTitle,
  formatSalary,
} from '@/features/jobs/utils/job-form.utils';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

interface JobItemProps {
  handleOpenJob: (id: string) => void;
  item: Job;
  t: (key: string, options?: Record<string, unknown>) => string;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export function JobItem({
  handleOpenJob,
  item,
  t,
  isFavorite,
  onToggleFavorite,
}: JobItemProps) {
  const title = formatJobTitle(item.title, t);
  const favoriteLabel = isFavorite
    ? t('inFavorites')
    : t('addToFavorites');
  const favoriteA11yLabel = isFavorite
    ? t('removeFromFavorites')
    : t('addToFavorites');

  return (
    <View className="mb-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <Pressable
          onPress={() => handleOpenJob(item._id)}
          accessibilityRole="button"
          accessibilityLabel={title}
          className="min-w-0 flex-1 hover:opacity-90 active:opacity-80"
        >
          <Text className="text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </Text>
          <Text className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {item.company}
          </Text>
          <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {item.location} • {item.workFormat}
          </Text>
          {item.salary && (
            <Text className="mt-2 text-sm font-medium text-green-700 dark:text-green-400">
              {formatSalary(item.salary, t)}
            </Text>
          )}
        </Pressable>
        <View className="flex-row items-center gap-2">
          {onToggleFavorite ? (
            <Pressable
              onPress={() => onToggleFavorite(item._id)}
              accessibilityRole="button"
              accessibilityLabel={favoriteA11yLabel}
              accessibilityState={{ selected: Boolean(isFavorite) }}
              className={`flex-row items-center gap-1 rounded-lg border px-3 py-2 hover:opacity-95 active:opacity-80 ${
                isFavorite
                  ? 'border-red-600 bg-red-600 dark:border-red-500 dark:bg-red-500'
                  : 'border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700'
              }`}
            >
              <MaterialIcons
                name={isFavorite ? 'favorite' : 'favorite-border'}
                size={18}
                color={isFavorite ? '#ffffff' : '#6B7280'}
              />
              <Text
                className={`text-center text-sm font-semibold ${
                  isFavorite
                    ? 'text-white'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {favoriteLabel}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => handleOpenJob(item._id)}
            accessibilityRole="button"
            accessibilityLabel={t('applyToJob')}
            className="rounded-lg bg-blue-600 px-3 py-2 hover:opacity-95 active:opacity-80 dark:bg-blue-500"
          >
            <Text className="text-center text-sm font-semibold text-white">
              {t('applyToJob')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
