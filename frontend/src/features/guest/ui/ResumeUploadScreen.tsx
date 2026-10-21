import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { AppHeader } from '@/shared/ui';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { Checkbox } from '@/shared/ui/checkbox/Checkbox';
import { NamedField } from '@/shared/ui/inputs/NamedField';
import { ChipSelector } from '@/shared/ui/selectors/ChipSelector';
import { router } from 'expo-router';
import { useState } from 'react';
import { submitAnalysis, analysisErrorCode } from '../api/analysis';
import { useAnalysisStore } from '../store/analysis.store';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResumeUploadStore } from '../store/resume-upload.store';
import { FilePicker } from './FilePicker';

const SOURCE_OPTIONS = ['file', 'text', 'linkedin'] as const;
const JOB_LOCATION_OPTIONS = ['home', 'abroad'] as const;

export function ResumeUploadScreen() {
  const { t, currentLanguage } = useTranslation('guest');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const file = useResumeUploadStore((state) => state.file);
  const setOutputLanguage = useResumeUploadStore(
    (state) => state.setOutputLanguage
  );
  const form = useResumeUploadStore((state) => state.form);
  const errors = useResumeUploadStore((state) => state.errors);
  const setSourceType = useResumeUploadStore((state) => state.setSourceType);
  const setFile = useResumeUploadStore((state) => state.setFile);
  const setResumeText = useResumeUploadStore((state) => state.setResumeText);
  const setLinkedinUrl = useResumeUploadStore((state) => state.setLinkedinUrl);
  const setJobLocation = useResumeUploadStore((state) => state.setJobLocation);
  const setTargetCountry = useResumeUploadStore(
    (state) => state.setTargetCountry
  );
  const setDesiredRole = useResumeUploadStore((state) => state.setDesiredRole);
  const setConsent = useResumeUploadStore((state) => state.setConsent);
  const validate = useResumeUploadStore((state) => state.validate);

  const hasError = (key: string) => errors.includes(key as never);

  const handleSubmit = async () => {
    if (submitting || !validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const access = await submitAnalysis(form, file, currentLanguage);
      useAnalysisStore.getState().setAccess(access);
      router.push('/analysis');
    } catch (error) {
      setSubmitError(analysisErrorCode(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={['top']}
    >
      <AppHeader />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
      >
        <View className="w-full max-w-md self-center">
          <Text className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-white">
            {t('upload.title')}
          </Text>

          {/* Способ предоставления резюме */}
          <ChipSelector
            label={t('upload.sourceLabel')}
            options={SOURCE_OPTIONS}
            selectedValue={form.sourceType}
            onSelect={(value) => {
              setSourceType(value);
              setSubmitError(null);
            }}
            translationKey="upload.source"
            namespace="guest"
            classNameSelector="mb-6"
          />

          {form.sourceType === 'file' && (
            <>
              <FilePicker
                fileName={form.fileName}
                onFileSelected={setFile}
                label={t('upload.file.choose')}
                hint={t('upload.file.hint')}
              />
              {hasError('invalidFormat') && (
                <Text className="mb-2 text-sm text-red-600 dark:text-red-400">
                  {t('upload.errors.invalidFormat')}
                </Text>
              )}
              {hasError('fileTooLarge') && (
                <Text className="mb-2 text-sm text-red-600 dark:text-red-400">
                  {t('upload.errors.fileTooLarge')}
                </Text>
              )}
              {hasError('emptyFile') && (
                <Text className="mb-2 text-sm text-red-600 dark:text-red-400">
                  {t('upload.errors.emptyFile')}
                </Text>
              )}
            </>
          )}

          {form.sourceType === 'text' && (
            <>
              <NamedField
                label={t('upload.text.label')}
                value={form.resumeText}
                onChangeText={setResumeText}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                placeholder={t('upload.text.placeholder')}
                inputClassName="rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white min-h-[160px]"
              />
              {hasError('emptyText') && (
                <Text className="mb-2 text-sm text-red-600 dark:text-red-400">
                  {t('upload.errors.emptyText')}
                </Text>
              )}
            </>
          )}

          {form.sourceType === 'linkedin' && (
            <>
              <NamedField
                label={t('upload.linkedin.label')}
                value={form.linkedinUrl}
                onChangeText={setLinkedinUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://www.linkedin.com/in/..."
              />
              <Text className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {t('upload.linkedin.hint')}
              </Text>
              {hasError('invalidLinkedinUrl') && (
                <Text className="mb-2 text-sm text-red-600 dark:text-red-400">
                  {t('upload.errors.invalidLinkedinUrl')}
                </Text>
              )}
            </>
          )}

          {/* Вопрос 1: чего хотите */}
          <ChipSelector
            label={t('upload.jobLocation.label')}
            options={JOB_LOCATION_OPTIONS}
            selectedValue={form.jobLocation ?? undefined}
            onSelect={(value) => setJobLocation(value)}
            translationKey="upload.jobLocation.options"
            namespace="guest"
            classNameSelector="mb-6"
          />
          {hasError('missingJobLocation') && (
            <Text className="mb-2 text-sm text-red-600 dark:text-red-400">
              {t('upload.errors.missingJobLocation')}
            </Text>
          )}

          {/* Вопрос 2: где ищете */}
          <NamedField
            label={t('upload.targetCountry.label')}
            value={form.targetCountry}
            onChangeText={setTargetCountry}
            placeholder={t('upload.targetCountry.placeholder')}
          />
          {hasError('missingTargetCountry') && (
            <Text className="mb-2 text-sm text-red-600 dark:text-red-400">
              {t('upload.errors.missingTargetCountry')}
            </Text>
          )}

          {/* Желаемая роль (необязательно) */}
          <NamedField
            label={t('upload.desiredRole.label')}
            value={form.desiredRole}
            onChangeText={setDesiredRole}
            placeholder={t('upload.desiredRole.placeholder')}
          />

          {/* Согласие на обработку ПД */}
          <ChipSelector
            label={t('upload.outputLanguage.label')}
            options={['original', 'en'] as const}
            selectedValue={form.outputLanguage}
            onSelect={setOutputLanguage}
            translationKey="upload.outputLanguage.options"
            namespace="guest"
            classNameSelector="mb-6"
          />
          <View className="mb-6 flex-row items-start">
            <Checkbox value={form.consent} onChange={setConsent} />
            <View className="ml-3 flex-1">
              <Text className="text-sm text-gray-700 dark:text-gray-300">
                {t('upload.consent.text')}{' '}
                <Text
                  className="text-blue-600 dark:text-blue-400"
                  onPress={() =>
                    router.push({
                      pathname: '/privacy-policy',
                      params: { from: '/upload' },
                    })
                  }
                >
                  {t('upload.consent.link')}
                </Text>
              </Text>
            </View>
          </View>
          {hasError('missingConsent') && (
            <Text className="mb-2 text-sm text-red-600 dark:text-red-400">
              {t('upload.errors.missingConsent')}
            </Text>
          )}

          {submitError && (
            <Text
              accessibilityRole="alert"
              className="mb-4 text-red-600 dark:text-red-400"
            >
              {t(`analysis.errors.${submitError}`, {
                defaultValue: t('analysis.errors.processing_failed'),
              })}
            </Text>
          )}
          <PrimaryButton onPress={handleSubmit} isLoading={submitting}>
            {t('upload.submit')}
          </PrimaryButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
