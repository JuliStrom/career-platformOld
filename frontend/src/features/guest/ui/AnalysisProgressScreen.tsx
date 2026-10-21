import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { AppHeader } from '@/shared/ui';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAnalysisStore } from '../store/analysis.store';
import {
  analysisErrorCode,
  readAnalysis,
  retryAnalysis,
} from '../api/analysis';
import type { AnalysisStatus } from '../model/analysis';

const STEPS = ['reading', 'evaluating', 'matching'] as const;

export function AnalysisProgressScreen() {
  const { t } = useTranslation('guest');
  const access = useAnalysisStore((state) => state.access);
  const [status, setStatus] = useState<AnalysisStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!access) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();
    const updateElapsed = () =>
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    setElapsedSeconds(0);
    const clockTimer = setInterval(updateElapsed, 1000);
    const stopClock = () => {
      updateElapsed();
      clearInterval(clockTimer);
    };
    setError(null);
    const poll = async () => {
      try {
        const response = await readAnalysis(access, controller.signal);
        if (controller.signal.aborted) return;
        setStatus(response.status);
        setError(response.error || null);
        if (response.status === 'completed') {
          stopClock();
          router.replace('/result');
          return;
        }
        if (response.status === 'failed') {
          stopClock();
          return;
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const code = analysisErrorCode(error);
        setError(code);
        if (code === 'analysis_not_found') {
          stopClock();
          return;
        }
      }
      timer = setTimeout(poll, 5000);
    };
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
      clearInterval(clockTimer);
    };
  }, [access, attempt]);

  const retry = async () => {
    if (!access) return;
    setRetrying(true);
    try {
      await retryAnalysis(access);
      setStatus('pending');
      setAttempt((value) => value + 1);
    } catch (error) {
      setError(analysisErrorCode(error));
    } finally {
      setRetrying(false);
    }
  };
  const stepIndex = Math.max(
    0,
    STEPS.indexOf(status as (typeof STEPS)[number])
  );

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={['top']}
    >
      <AppHeader />
      <View className="flex-1 items-center justify-center p-6">
        <View className="w-full max-w-md">
          <Text
            accessibilityRole="header"
            className="mb-6 text-center text-2xl font-semibold text-gray-900 dark:text-white"
          >
            {t('analysis.progress.title')}
          </Text>
          {access && status !== 'failed' && error !== 'analysis_not_found' && (
            <ActivityIndicator size="large" color="#3B82F6" />
          )}
          {access &&
            STEPS.map((step, index) => (
              <Text
                key={step}
                className={`mt-5 text-base ${index === stepIndex ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {index < stepIndex ? '✓' : index + 1}.{' '}
                {t(`analysis.progress.steps.${step}`)}
              </Text>
            ))}
          {access && (
            <Text className="mt-6 text-center text-gray-600 dark:text-gray-300">
              {'\u23F1'}{' '}
              {t('analysis.elapsed', {
                time: `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`,
              })}
            </Text>
          )}
          {error && (
            <Text
              accessibilityRole="alert"
              className="my-6 text-red-600 dark:text-red-400"
            >
              {t(`analysis.errors.${error}`, {
                defaultValue: t('analysis.errors.processing_failed'),
              })}
            </Text>
          )}
          {status === 'failed' && (
            <PrimaryButton onPress={retry} isLoading={retrying}>
              {t('analysis.timeout.retry')}
            </PrimaryButton>
          )}
          {(!access ||
            error === 'analysis_not_found' ||
            error === 'source_expired') && (
            <PrimaryButton onPress={() => router.replace('/upload')}>
              {t('uploadResume')}
            </PrimaryButton>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
