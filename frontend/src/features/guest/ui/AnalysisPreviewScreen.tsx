import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { AppHeader } from '@/shared/ui';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, ScrollView, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  DEMO_ANALYSIS_PREVIEW,
  getResumeLevel,
} from '../model/analysis-preview';

const LOCKED_SECTIONS = [
  'strengths',
  'experience',
  'skills',
  'directions',
  'plan',
] as const;
const cardClass =
  'mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800';

export function AnalysisPreviewScreen() {
  const { t } = useTranslation('guest');
  const result = DEMO_ANALYSIS_PREVIEW;
  const level = getResumeLevel(result.score);
  const remainingJobs = Math.max(0, result.totalJobs - result.jobs.length);

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={['top']}
    >
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <View className="w-full max-w-2xl self-center">
          <Text
            accessibilityRole="header"
            className="mb-3 text-3xl font-bold text-gray-900 dark:text-white"
          >
            {t('preview.title')}
          </Text>
          <Text className="mb-6 text-base text-gray-600 dark:text-gray-400">
            {t('preview.subtitle')}
          </Text>
          <View className="mb-6 rounded-xl bg-amber-50 p-4 dark:bg-amber-950">
            <Text className="text-sm text-amber-900 dark:text-amber-200">
              {t('preview.demo')}
            </Text>
          </View>

          <View className={cardClass}>
            <Text className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
              {t('preview.score')}
            </Text>
            <View className="mb-4 flex-row flex-wrap items-center gap-3">
              <Text
                accessibilityLabel={t('preview.scoreValue', {
                  score: result.score,
                })}
                className="text-5xl font-bold text-blue-600 dark:text-blue-400"
              >
                {result.score}
                <Text className="text-xl text-gray-500"> / 100</Text>
              </Text>
              <Text className="rounded-full bg-blue-50 px-3 py-2 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                {t(`preview.level.${level}`)}
              </Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <View
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${result.score}%` }}
              />
            </View>
            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t('preview.scale')}
            </Text>
          </View>

          <Text
            accessibilityRole="header"
            className="mb-4 mt-4 text-xl font-bold text-gray-900 dark:text-white"
          >
            {t('preview.problemsTitle')}
          </Text>
          {result.problems.map((problem, index) => (
            <View key={problem} className={cardClass}>
              <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {index + 1}. {t(`preview.problems.${problem}.title`)}
              </Text>
              <Text className="text-base leading-6 text-gray-600 dark:text-gray-300">
                {t(`preview.problems.${problem}.reason`)}
              </Text>
            </View>
          ))}

          <Text
            accessibilityRole="header"
            className="mb-4 mt-4 text-xl font-bold text-gray-900 dark:text-white"
          >
            {t('preview.jobsTitle', { count: result.totalJobs })}
          </Text>
          {result.jobs.map((job) => (
            <View key={job.id} className={cardClass}>
              <Text className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                {t(`preview.jobs.${job.id}.title`)}
              </Text>
              <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                {job.company} · {t('preview.remote')}
              </Text>
              <Text className="mb-3 text-lg font-semibold text-blue-600 dark:text-blue-400">
                {job.salary} {t('preview.perMonth')}
              </Text>
              <Text className="mb-3 text-base leading-6 text-gray-600 dark:text-gray-300">
                {t(`preview.jobs.${job.id}.description`)}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {job.tags.map((tag) => (
                  <Text
                    key={tag}
                    className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                  >
                    {tag}
                  </Text>
                ))}
              </View>
            </View>
          ))}

          {remainingJobs > 0 && (
            <View className="mb-8 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                pointerEvents="none"
                style={
                  Platform.OS === 'web'
                    ? ({ filter: 'blur(7px)' } as ViewStyle)
                    : { opacity: 0.15 }
                }
                className="gap-3 p-5"
              >
                {[0, 1, 2].map((item) => (
                  <View
                    key={item}
                    className="h-24 gap-3 rounded-xl bg-white p-4 dark:bg-gray-800"
                  >
                    <View className="h-4 w-2/3 rounded bg-gray-300 dark:bg-gray-500" />
                    <View className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-600" />
                    <View className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-600" />
                  </View>
                ))}
              </View>
              <View className="absolute inset-0 items-center justify-center bg-white/70 px-5 dark:bg-gray-900/80">
                <Ionicons
                  name="lock-closed-outline"
                  size={28}
                  color="#3B82F6"
                />
                <Text className="mt-3 text-center text-lg font-semibold text-gray-900 dark:text-white">
                  {t('preview.moreJobs', { count: remainingJobs })}
                </Text>
                <Text className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
                  {t('preview.lockedHint')}
                </Text>
              </View>
            </View>
          )}

          <Text
            accessibilityRole="header"
            className="mb-4 text-xl font-bold text-gray-900 dark:text-white"
          >
            {t('preview.fullAnalysis')}
          </Text>
          {LOCKED_SECTIONS.map((section) => (
            <View
              key={section}
              className="mb-3 flex-row items-center gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700"
            >
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
              <Text className="flex-1 text-base font-medium text-gray-600 dark:text-gray-300">
                {t(`preview.sections.${section}`)}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {t('preview.locked')}
              </Text>
            </View>
          ))}
          <View className="mt-6">
            <PrimaryButton onPress={() => router.push('/register')}>
              {t('preview.unlock')}
            </PrimaryButton>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
