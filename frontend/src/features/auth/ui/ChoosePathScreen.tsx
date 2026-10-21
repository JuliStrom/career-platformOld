import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { UserType } from '@/shared/model';
import { AppHeader } from '@/shared/ui';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { Redirect, type Href, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/auth.store';
import { UserTypePicker } from './UserTypePicker';

export function ChoosePathScreen() {
  const { t } = useTranslation('auth');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.authError);
  const userType = useAuthStore((state) => state.user?.userType);
  const setUserType = useAuthStore((state) => state.setUserType);

  const [selected, setSelected] = useState<UserType | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  if (userType && !hasSubmitted) {
    return (
      <Redirect
        href={(userType === UserType.EMPLOYER ? '/employer' : '/jobs') as Href}
      />
    );
  }

  const handleSubmit = async () => {
    if (!selected) return;
    setLocalError(null);
    setHasSubmitted(true);
    try {
      await setUserType(selected);
      router.replace(
        selected === UserType.EMPLOYER
          ? '/employer-onboarding'
          : '/specialist-onboarding'
      );
    } catch {
      setHasSubmitted(false);
      setLocalError(t('choosePath.error'));
    }
  };

  const error = authError || localError;

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
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-md self-center">
          <View
            className="mb-8"
            accessibilityRole="header"
            accessibilityLabel={t('choosePath.title')}
          >
            <Text className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-white">
              {t('choosePath.title')}
            </Text>
            <Text className="text-center text-base text-gray-600 dark:text-gray-400">
              {t('choosePath.subtitle')}
            </Text>
          </View>

          {error && (
            <View className="mb-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <Text className="text-sm text-red-600 dark:text-red-400">
                {error}
              </Text>
            </View>
          )}

          <UserTypePicker
            value={selected}
            onSelect={setSelected}
            disabled={isLoading}
          />

          {!selected && (
            <Text className="mb-3 text-sm text-amber-600 dark:text-amber-400">
              {t('choosePath.requiredHint')}
            </Text>
          )}

          <PrimaryButton
            onPress={handleSubmit}
            isLoading={isLoading}
            disabled={!selected}
            accessibilityLabel={t('choosePath.submit')}
          >
            {t('choosePath.submit')}
          </PrimaryButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
