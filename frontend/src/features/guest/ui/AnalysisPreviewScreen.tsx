import { useAuthStore } from '@/features/auth/store/auth.store';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { AppHeader } from '@/shared/ui';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  analysisErrorCode,
  claimAnalysis,
  downloadAnalysis,
  readAnalysis,
  readFullAnalysis,
} from '../api/analysis';
import type {
  AnalysisPreview,
  FullAnalysis,
  MatchedJob,
} from '../model/analysis';
import { useAnalysisStore } from '../store/analysis.store';
import { AnalysisNavigation } from './AnalysisNavigation';

const LOCKED_SECTIONS = [
  'strengths',
  'experience',
  'skills',
  'directions',
  'plan',
] as const;
const card =
  'mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#102139] p-5';
const heading = 'mb-3 mt-5 text-xl font-bold text-slate-900 dark:text-white';
const body = 'mb-2 text-base leading-6 text-slate-600 dark:text-slate-300';

function JobCard({ job }: { job: MatchedJob }) {
  const { t } = useTranslation('guest');
  return (
    <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#102139]">
      <Text
        className="mb-1 text-base font-semibold text-slate-900 dark:text-white"
        numberOfLines={2}
      >
        {job.title}
      </Text>
      <Text
        className="text-sm leading-5 text-slate-600 dark:text-slate-300"
        numberOfLines={2}
      >
        {job.company} · {job.location} · {job.workFormat}
      </Text>
      {job.salary && (job.salary.min != null || job.salary.max != null) && (
        <Text className="mt-2 text-sm font-semibold text-blue-600 dark:text-blue-300">
          {job.salary.min ?? '…'}–{job.salary.max ?? '…'} {job.salary.currency}
        </Text>
      )}
      {job.matchedSkills.length > 0 && (
        <Text
          className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400"
          numberOfLines={2}
        >
          {t('preview.matchedSkills')}: {job.matchedSkills.join(', ')}
        </Text>
      )}
      {job.locationNeedsConfirmation && (
        <Text className="mt-2 text-sm text-amber-700 dark:text-amber-300">
          {t('preview.confirmLocation')}
        </Text>
      )}
    </View>
  );
}

function PrivateAnalysis({ result }: { result: FullAnalysis }) {
  const { t } = useTranslation('guest');
  return (
    <>
      <Text className={heading}>{t('preview.criteria')}</Text>
      {Object.entries(result.criteria).map(([key, value]) => (
        <View key={key} className={card}>
          <Text className="mb-2 font-semibold text-slate-900 dark:text-white">
            {t(`preview.criterion.${key}`)} · {value.score}
          </Text>
          <Text className={body}>{value.explanation}</Text>
        </View>
      ))}
      <Text className={heading}>{t('preview.profile')}</Text>
      <View className={card}>
        <Text className={body}>
          {[
            result.profile.role,
            result.profile.direction,
            result.profile.level,
            result.profile.location,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <Text className={body}>
          {t('preview.detectedLanguage')}: {result.language}
        </Text>
        <Text className={body}>{result.profile.skills.join(', ')}</Text>
        {result.profile.experience.map((item, i) => (
          <View key={i} className="mt-4">
            <Text className="mb-2 font-semibold text-slate-900 dark:text-white">
              {[item.company, item.role, item.startDate, item.endDate]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {[...item.responsibilities, ...item.achievements].map((line, j) => (
              <Text key={j} className={body}>
                • {line}
              </Text>
            ))}
          </View>
        ))}
        {result.profile.education.map((item, i) => (
          <Text key={i} className={body}>
            {[item.institution, item.degree, item.dates]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ))}
        {result.profile.languages.map((item, i) => (
          <Text key={i} className={body}>
            {item.language}
            {item.level ? ` · ${item.level}` : ''}
          </Text>
        ))}
      </View>
      {(['strengths', 'recommendations', 'questions'] as const).map((key) => (
        <View key={key}>
          <Text className={heading}>{t(`preview.${key}`)}</Text>
          {result[key].map((line, i) => (
            <Text key={i} className={body}>
              • {line}
            </Text>
          ))}
        </View>
      ))}
      <Text className={heading}>
        {t('preview.improvedResume')} · {result.improvedResume.language}
      </Text>
      <View className={card}>
        {result.improvedResume.sections.map((section, i) => (
          <View key={i}>
            <Text className={heading}>{section.title}</Text>
            <Text selectable className={body}>
              {section.content}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

export function AnalysisPreviewScreen() {
  const { analysisId } = useLocalSearchParams<{ analysisId?: string }>();
  const { t } = useTranslation('guest');
  const access = useAnalysisStore((state) => state.access);
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const [result, setResult] = useState<AnalysisPreview | null>(null);
  const [full, setFull] = useState<{
    owner: string;
    result: FullAnalysis;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFull(null);
    setResult(null);
    if (!access && !analysisId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        if (authenticated && userId) {
          if (!analysisId && access) await claimAnalysis(access);
          const data = await readFullAnalysis(analysisId || access!.id);
          if (!cancelled) {
            setFull({ owner: userId, result: data });
            useAnalysisStore.getState().setPendingUnlock(false);
          }
        } else if (access) {
          const data = await readAnalysis(access);
          if (!cancelled) {
            if (data.status !== 'completed') {
              router.replace('/analysis');
              return;
            }
            setResult(data.preview || null);
          }
        }
      } catch (error) {
        if (!cancelled) setError(analysisErrorCode(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [access, authenticated, userId, attempt, analysisId]);

  const download = async () => {
    if (!access && !analysisId) return;
    setDownloading(true);
    try {
      await downloadAnalysis(analysisId || access!.id);
    } catch (error) {
      setError(analysisErrorCode(error));
    } finally {
      setDownloading(false);
    }
  };
  // Private state is keyed to its owner and is never rendered after logout/account switch.
  const privateResult =
    authenticated && full && full.owner === userId ? full.result : null;
  const visible = privateResult || result;
  const visibleJobs = privateResult
    ? privateResult.jobs
    : (result?.jobs.slice(0, 3) ?? []);
  const remaining = visible
    ? Math.max(0, visible.totalJobs - visibleJobs.length)
    : 0;

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-[#071426]"
      edges={['top']}
    >
      <AppHeader />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
      >
        <View className="w-full max-w-2xl self-center">
          <Text
            accessibilityRole="header"
            className="mb-4 text-3xl font-bold text-slate-900 dark:text-white"
          >
            {t(privateResult ? 'preview.fullAnalysis' : 'preview.title')}
          </Text>
          {loading && <ActivityIndicator size="large" color="#3B82F6" />}
          {error && (
            <View>
              <Text
                accessibilityRole="alert"
                className="mb-4 text-red-600 dark:text-red-300"
              >
                {t(`analysis.errors.${error}`, {
                  defaultValue: t('analysis.errors.processing_failed'),
                })}
              </Text>
              <PrimaryButton onPress={() => setAttempt((value) => value + 1)}>
                {t('analysis.timeout.retry')}
              </PrimaryButton>
            </View>
          )}
          {!access && !analysisId && (
            <PrimaryButton onPress={() => router.replace('/upload')}>
              {t('uploadResume')}
            </PrimaryButton>
          )}
          {!loading && visible && (
            <>
              <View className={card}>
                <Text className={body}>{t('preview.score')}</Text>
                <Text className="mb-3 text-5xl font-bold text-blue-600 dark:text-blue-300">
                  {visible.score}
                  <Text className="text-xl"> / 100</Text>
                </Text>
                <Text className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
                  {t(`preview.level.${visible.level}`)}
                </Text>
                <View className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <View
                    className="h-full bg-blue-500"
                    style={{ width: `${visible.score}%` }}
                  />
                </View>
                <Text className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  {t('preview.scale')}
                </Text>
              </View>
              <Text accessibilityRole="header" className={heading}>
                {t('preview.problemsTitle')}
              </Text>
              {visible.problems.map((problem, i) => (
                <View key={i} className={card}>
                  <Text className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                    {i + 1}. {problem.title}
                  </Text>
                  <Text className={body}>{problem.explanation}</Text>
                </View>
              ))}
              {privateResult && (
                <>
                  <PrivateAnalysis result={privateResult} />
                  <PrimaryButton onPress={download} isLoading={downloading}>
                    {t('preview.download')}
                  </PrimaryButton>
                </>
              )}
              <Text accessibilityRole="header" className={heading}>
                {t('preview.jobsTitle', { count: visible.totalJobs })}
              </Text>
              {visibleJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
              {visibleJobs.length === 0 && (
                <Text className={body}>{t('preview.noJobs')}</Text>
              )}
              {!privateResult && remaining > 0 && (
                <View className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#102139]">
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    aria-hidden
                    pointerEvents="none"
                    className="absolute inset-0 justify-center gap-2 px-5"
                    style={
                      Platform.OS === 'web'
                        ? ({
                            filter: 'blur(7px)',
                            userSelect: 'none',
                          } as ViewStyle)
                        : { opacity: 0.15 }
                    }
                  >
                    <View className="h-4 w-3/4 rounded bg-slate-300 dark:bg-slate-600" />
                    <View className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      useAnalysisStore.getState().setPendingUnlock(true);
                      router.push('/register');
                    }}
                    className="min-h-20 flex-row items-center justify-center gap-3 bg-white/80 px-4 py-5 dark:bg-[#102139]/80"
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#3B82F6"
                    />
                    <Text className="shrink text-center text-base font-semibold text-slate-900 dark:text-white">
                      {t('preview.moreJobs', { count: remaining })}
                    </Text>
                  </Pressable>
                </View>
              )}
              {!privateResult && !authenticated && (
                <>
                  <Text className={heading}>{t('preview.fullAnalysis')}</Text>
                  {LOCKED_SECTIONS.map((section) => (
                    <View
                      key={section}
                      className="mb-3 flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#102139]"
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#9CA3AF"
                      />
                      <Text className="flex-1 text-base text-slate-600 dark:text-slate-300">
                        {t(`preview.sections.${section}`)}
                      </Text>
                    </View>
                  ))}
                  <PrimaryButton
                    className="mt-6"
                    onPress={() => {
                      useAnalysisStore.getState().setPendingUnlock(true);
                      router.push('/register');
                    }}
                  >
                    {t('preview.unlock')}
                  </PrimaryButton>
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
      {authenticated && <AnalysisNavigation />}
    </SafeAreaView>
  );
}
