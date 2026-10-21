import { apiClient } from '@/shared/config/api';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { transferGuestAnalyses } from '@/features/guest/api/analysis';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

type Entry = {
  id: string;
  status: string;
  createdAt: string;
  goal: { desiredRole?: string; targetCountry?: string };
};
export default function ResumeHistory() {
  const userId = useAuthStore((state) => state.user?.id);
  const { t, currentLanguage } = useTranslation('guest');
  const [items, setItems] = useState<Entry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(false);
      setItems([]);
      (userId ? transferGuestAnalyses(userId) : Promise.resolve())
        .then(() =>
          apiClient.get('/guest/analyses/history', {
            params: { page },
            headers: attempt > 0 ? { 'Cache-Control': 'no-cache' } : undefined,
          })
        )
        .then(({ data }) => {
          if (!cancelled) {
            setItems(data.items);
            setTotal(data.total);
          }
        })
        .catch(() => {
          if (!cancelled) setError(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [page, attempt, userId])
  );
  return (
    <ScrollView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
    >
      <View className="w-full max-w-2xl self-center">
        <Text className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
          {t('history.title')}
        </Text>
        {loading && <ActivityIndicator color="#3b82f6" />}
        {error && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setAttempt((value) => value + 1)}
            className="min-h-12 justify-center"
          >
            <Text className="text-blue-600 dark:text-blue-400">
              {t('analysis.timeout.retry')}
            </Text>
          </Pressable>
        )}
        {!loading && !error && items.length === 0 && (
          <Text className="text-slate-600 dark:text-slate-300">
            {t('history.empty')}
          </Text>
        )}
        {items.map((item) => (
          <View
            key={item.id}
            className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
          >
            <Text className="mb-2 font-semibold text-slate-900 dark:text-white">
              {item.goal.desiredRole || t('preview.fullAnalysis')}
            </Text>
            <Text className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              {new Date(item.createdAt).toLocaleDateString(currentLanguage)} ·{' '}
              {item.goal.targetCountry}
            </Text>
            {item.status === 'completed' ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/result',
                    params: { analysisId: item.id },
                  })
                }
                className="min-h-11 justify-center"
              >
                <Text className="font-semibold text-blue-600 dark:text-blue-400">
                  {t('history.open')}
                </Text>
              </Pressable>
            ) : (
              <Text className="text-sm text-slate-500 dark:text-slate-400">
                {t(
                  item.status === 'failed'
                    ? 'analysis.errors.processing_failed'
                    : 'analysis.progress.title'
                )}
              </Text>
            )}
          </View>
        ))}
        <View className="flex-row justify-between gap-4">
          {page > 1 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setPage((value) => value - 1)}
              className="min-h-12 justify-center"
            >
              <Text className="text-blue-600 dark:text-blue-400">
                {t('history.previous')}
              </Text>
            </Pressable>
          )}
          {page * 20 < total && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setPage((value) => value + 1)}
              className="min-h-12 justify-center"
            >
              <Text className="text-blue-600 dark:text-blue-400">
                {t('history.next')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
