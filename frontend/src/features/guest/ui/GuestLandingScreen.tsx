import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { AppHeader } from '@/shared/ui';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGuestSessionStore } from '../store/guest-session.store';

export function GuestLandingScreen() {
  const { t } = useTranslation('guest');
  const captureFromUrl = useGuestSessionStore((state) => state.captureFromUrl);

  useEffect(() => {
    captureFromUrl();
  }, [captureFromUrl]);

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={['top']}
    >
      <AppHeader />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 24,
          flexGrow: 1,
          justifyContent: 'center',
        }}
      >
        <View className="w-full max-w-md self-center">
          <View className="mb-10" accessibilityRole="header">
            <Text className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </Text>
            <Text className="text-center text-base text-gray-600 dark:text-gray-400">
              {t('subtitle')}
            </Text>
          </View>

          <PrimaryButton
            onPress={() => router.push('/upload')}
            accessibilityLabel={t('uploadResume')}
          >
            {t('uploadResume')}
          </PrimaryButton>

          <Text
            className="text-center text-base text-blue-600 dark:text-blue-400"
            onPress={() => router.push('/no-resume')}
          >
            {t('noResume')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
