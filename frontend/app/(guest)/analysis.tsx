import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { AppHeader } from '@/shared/ui';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Заглушка: экран AI-разбора (Э3) будет реализован отдельно. */
export default function GuestAnalysis() {
  const { t } = useTranslation('guest');
  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={['top']}
    >
      <AppHeader />
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-lg text-gray-700 dark:text-gray-300">
          {t('analysis.placeholder')}
        </Text>
      </View>
    </SafeAreaView>
  );
}
