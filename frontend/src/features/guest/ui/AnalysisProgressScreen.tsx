import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { AppHeader } from '@/shared/ui';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ANALYSIS_TIMEOUT_MS = 60_000; // 60 секунд
const STEP_DURATION_MS = ANALYSIS_TIMEOUT_MS / 3; // по ~20 сек на шаг

type AnalysisStep = 'reading' | 'evaluating' | 'matching';

const STEPS: AnalysisStep[] = ['reading', 'evaluating', 'matching'];

export function AnalysisProgressScreen() {
  const { t } = useTranslation('guest');
  const [currentStep, setCurrentStep] = useState<AnalysisStep>('reading');
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Сбрасываем состояние при каждом новом запуске (повтор без повторной загрузки).
    setCurrentStep('reading');
    setTimedOut(false);

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Прогресс по шагам.
    STEPS.forEach((step, index) => {
      if (index === 0) return;
      timers.push(
        setTimeout(() => {
          setCurrentStep(step);
        }, STEP_DURATION_MS * index)
      );
    });

    // Таймаут всего анализа.
    timers.push(
      setTimeout(() => {
        setTimedOut(true);
      }, ANALYSIS_TIMEOUT_MS)
    );

    timersRef.current = timers;

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [attempt]);

  const handleRetry = () => {
    setAttempt((prev) => prev + 1);
  };

  const stepIndex = STEPS.indexOf(currentStep);

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={['top']}
    >
      <AppHeader />
      <View className="flex-1 items-center justify-center p-6">
        <View className="w-full max-w-md">
          {timedOut ? (
            <View className="items-center">
              <Text className="mb-3 text-center text-2xl font-bold text-gray-900 dark:text-white">
                {t('analysis.timeout.title')}
              </Text>
              <Text className="mb-6 text-center text-base text-gray-600 dark:text-gray-400">
                {t('analysis.timeout.message')}
              </Text>
              <PrimaryButton onPress={handleRetry} className="w-full">
                {t('analysis.timeout.retry')}
              </PrimaryButton>
            </View>
          ) : (
            <View className="items-center">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="mt-6 mb-8 text-center text-xl font-semibold text-gray-900 dark:text-white">
                {t('analysis.progress.title')}
              </Text>

              <View className="w-full">
                {STEPS.map((step, index) => {
                  const isActive = index === stepIndex;
                  const isDone = index < stepIndex;
                  return (
                    <View key={step} className="mb-4 flex-row items-center">
                      <View
                        className={`h-6 w-6 items-center justify-center rounded-full ${
                          isDone
                            ? 'bg-green-500'
                            : isActive
                              ? 'bg-blue-600'
                              : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        {isDone ? (
                          <Text className="text-xs font-bold text-white">✓</Text>
                        ) : isActive ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            {index + 1}
                          </Text>
                        )}
                      </View>
                      <Text
                        className={`ml-3 text-base ${
                          isActive
                            ? 'font-semibold text-gray-900 dark:text-white'
                            : isDone
                              ? 'text-gray-700 dark:text-gray-300'
                              : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {t(`analysis.progress.steps.${step}`)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
