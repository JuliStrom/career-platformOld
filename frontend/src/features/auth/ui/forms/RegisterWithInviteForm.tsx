import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { Checkbox } from '@/shared/ui/checkbox/Checkbox';
import { AppHeader, NamedField } from '@/shared/ui';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { zodResolver } from '@hookform/resolvers/zod';
import type { RegisterFormData } from '../../model/schemas';
import { createRegisterSchema } from '../../model/schemas';
import { analytics } from '@/features/analytics/lib/track';
import { useAuthStore } from '../../store/auth.store';
import { BaseAuthFields } from './BaseAuthFields';
import { OAuthButtons } from '../OAuthButtons';
import { RegisterExtraFields } from './RegisterExtraFields';
import { ToggleAuthMode } from './ToggleAuthMode';
import { handleApiError } from '@/shared/config/api';
import { useAnalysisStore } from '@/features/guest/store/analysis.store';

interface RegisterWithInviteFormProps {
  inviteCode: string;
}

export function RegisterWithInviteForm({
  inviteCode,
}: RegisterWithInviteFormProps) {
  const { t } = useTranslation('auth');
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.authError);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearError = useAuthStore((state) => state.clearError);
  const pendingAnalysis = useAnalysisStore(
    (state) => state.pendingUnlock && Boolean(state.access)
  );

  const [localError, setLocalError] = useState<string | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const registerSchema = useMemo(() => createRegisterSchema(), []);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  const {
    control,
    formState: { errors },
  } = form;

  // Форма только для регистрации — новый аккаунт сразу выбирает путь платформы
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace(pendingAnalysis ? '/result' : '/choose-path');
    }
  }, [isAuthenticated, isLoading, pendingAnalysis]);

  useEffect(() => {
    clearError();
    setLocalError(null);
    analytics.registerStarted(inviteCode);
  }, [inviteCode, clearError]);

  const onSubmit = async (data: RegisterFormData) => {
    setLocalError(null);
    clearError();

    try {
      await register({
        name: data.name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        inviteCode,
      });
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : handleApiError(error)
      );
    }
  };

  const error = authError || localError;

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={['top']}
    >
      <AppHeader />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
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
              accessibilityLabel={t('accessibility.registerLabel')}
            >
              <Text className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-white">
                {t('register.title')}
              </Text>
              <Text className="text-center text-base text-gray-600 dark:text-gray-400">
                {t('register.subtitle')}
              </Text>
            </View>

            {error && (
              <View className="mb-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <Text className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </Text>
              </View>
            )}

            {Object.keys(form.formState.errors).length > 0 && (
              <View className="mb-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                <Text className="text-sm text-amber-800 dark:text-amber-200">
                  {t('validation.checkFields')}
                </Text>
              </View>
            )}

            <Controller
              control={control}
              name="name"
              render={({
                field: { onChange, onBlur, value },
                fieldState: { isTouched },
              }) => (
                <NamedField
                  value={value}
                  error={errors.name?.message}
                  touched={isTouched}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  nativeID="auth-name-label"
                  label={t('register.name')}
                  placeholder={t('register.name')}
                  margin="mb-4"
                />
              )}
            />

            <BaseAuthFields
              t={t}
              control={
                control as Parameters<typeof BaseAuthFields>[0]['control']
              }
              errors={errors}
            />

            <RegisterExtraFields t={t} control={control} errors={errors} />

            <View className="mb-4 mt-4 flex-row items-start">
              <Checkbox value={privacyAccepted} onChange={setPrivacyAccepted} />
              <Text className="ml-3 flex-1 text-sm text-gray-700 dark:text-gray-300">
                {t('privacy.agree')}
                <Text
                  className="text-blue-600 dark:text-blue-400"
                  onPress={() =>
                    router.push({
                      pathname: '/privacy-policy',
                      params: { from: '/register' },
                    })
                  }
                >
                  {t('privacy.policy')}
                </Text>
                {t('privacy.and')}
                <Text
                  className="text-blue-600 dark:text-blue-400"
                  onPress={() =>
                    router.push({
                      pathname: '/terms-of-service',
                      params: { from: '/register' },
                    })
                  }
                >
                  {t('privacy.terms')}
                </Text>
              </Text>
            </View>

            {!privacyAccepted && (
              <Text className="mb-3 text-sm text-amber-600 dark:text-amber-400">
                {t('privacy.requiredHint')}
              </Text>
            )}
            <PrimaryButton
              onPress={form.handleSubmit(onSubmit)}
              isLoading={isLoading}
              disabled={!privacyAccepted}
              accessibilityLabel={t('accessibility.submitButton')}
            >
              {t('register.submit')}
            </PrimaryButton>

            <OAuthButtons inviteCode={inviteCode} />

            {ToggleAuthMode(true, t, () => router.push('/(auth)/login'))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
