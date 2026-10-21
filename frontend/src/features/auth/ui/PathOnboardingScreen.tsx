import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { UserType } from '@/shared/model';
import { AppHeader } from '@/shared/ui';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { Redirect, type Href, router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/auth.store';

interface PathOnboardingScreenProps {
  userType: UserType;
}

export function PathOnboardingScreen({ userType }: PathOnboardingScreenProps) {
  const { t } = useTranslation('auth');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUserType = useAuthStore((state) => state.user?.userType);
  const isEmployer = userType === UserType.EMPLOYER;
  const translationKey = isEmployer
    ? 'pathOnboarding.employer'
    : 'pathOnboarding.specialist';

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  if (currentUserType && currentUserType !== userType) {
    return (
      <Redirect
        href={
          currentUserType === UserType.EMPLOYER
            ? '/employer-onboarding'
            : '/specialist-onboarding'
        }
      />
    );
  }

  const handleContinue = () => {
    router.replace((isEmployer ? '/employer' : '/jobs') as Href);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={['top', 'bottom']}
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
          <Text className="mb-3 text-center text-3xl font-bold text-gray-900 dark:text-white">
            {t(`${translationKey}.title`)}
          </Text>
          <Text className="mb-8 text-center text-base leading-6 text-gray-600 dark:text-gray-300">
            {t(`${translationKey}.subtitle`)}
          </Text>

          {[1, 2, 3].map((step) => (
            <View
              key={step}
              className="mb-3 flex-row rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                <Text className="font-bold text-white">{step}</Text>
              </View>
              <View className="flex-1">
                <Text className="mb-1 font-semibold text-gray-900 dark:text-white">
                  {t(`${translationKey}.steps.${step}.title`)}
                </Text>
                <Text className="text-sm leading-5 text-gray-600 dark:text-gray-300">
                  {t(`${translationKey}.steps.${step}.description`)}
                </Text>
              </View>
            </View>
          ))}

          <PrimaryButton
            onPress={handleContinue}
            className="mt-5"
            accessibilityLabel={t(`${translationKey}.continue`)}
          >
            {t(`${translationKey}.continue`)}
          </PrimaryButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
