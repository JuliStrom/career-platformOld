import {
  useNoResumeStore,
  experienceFields,
  emptyExperience,
} from '../store/no-resume.store';
import {
  ResumeFormLayout,
  ResumeConsent,
  ResumeField as Field,
} from './ResumeFormLayout';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { Checkbox } from '@/shared/ui/checkbox/Checkbox';
import { ChipSelector } from '@/shared/ui/selectors/ChipSelector';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { analysisErrorCode, submitAnalysis } from '../api/analysis';
import { EMPTY_RESUME_FORM } from '../model/types';
import { useAnalysisStore } from '../store/analysis.store';

export function NoResumeScreen() {
  const { t, currentLanguage } = useTranslation('guest');
  const { draft, update } = useNoResumeStore();
  const [submitting, setSubmitting] = useState(false);
  const [validation, setValidation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = (key: string) => t(`builder.${key}`);
  const missingFields =
    !draft.role.trim() ||
    !draft.skills.trim() ||
    !draft.location.trim() ||
    !draft.targetCountry.trim() ||
    (!draft.noExperience &&
      draft.experience.some(
        (item) =>
          !item.company.trim() ||
          !item.role.trim() ||
          !item.start.trim() ||
          !item.end.trim() ||
          !item.duties.trim()
      ));
  const handleSubmit = async () => {
    if (submitting) return;
    setValidation(true);
    if (missingFields || !draft.consent) return;
    setSubmitting(true);
    setError(null);
    const resumeText = [
      `Role: ${draft.role.trim()}`,
      `Location: ${draft.location.trim()}`,
      'Experience:',
      draft.noExperience
        ? 'No professional experience yet.'
        : draft.experience
            .map(
              (item) =>
                `Company: ${item.company.trim()}\nRole: ${item.role.trim()}\nDates: ${item.start.trim()} — ${item.end.trim()}\nResponsibilities: ${item.duties.trim()}\nAchievements: ${item.achievements.trim()}`
            )
            .join('\n\n'),
      `Skills: ${draft.skills.trim()}`,
      `Education: ${draft.education.trim()}`,
      `Languages: ${draft.languages.trim()}`,
    ].join('\n\n');
    try {
      const access = await submitAnalysis(
        {
          ...EMPTY_RESUME_FORM,
          sourceType: 'text',
          resumeText,
          desiredRole: draft.role.trim(),
          targetCountry: draft.targetCountry.trim(),
          jobLocation: draft.jobLocation,
          consent: draft.consent,
        },
        null,
        currentLanguage
      );
      useAnalysisStore.getState().setAccess(access);
      router.push('/analysis');
    } catch (error) {
      setError(analysisErrorCode(error));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <ResumeFormLayout title={label('title')} subtitle={label('subtitle')}>
      <Field
        label={label('role')}
        value={draft.role}
        onChangeText={(role) => update({ role })}
        placeholder={t('upload.desiredRole.placeholder')}
      />
      <Text className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
        {label('experience')}
      </Text>
      <View className="mb-6 flex-row items-center gap-3">
        <Checkbox
          value={draft.noExperience}
          onChange={(noExperience) => update({ noExperience })}
        />
        <Text
          onPress={() => update({ noExperience: !draft.noExperience })}
          className="flex-1 text-sm text-slate-600 dark:text-slate-300"
        >
          {label('noExperience')}
        </Text>
      </View>
      {!draft.noExperience && (
        <>
          {draft.experience.map((item, index) => (
            <View
              key={item.id}
              className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40"
            >
              <View className="mb-5 flex-row items-center justify-between gap-3">
                <Text className="font-semibold text-slate-700 dark:text-slate-200">
                  {label('workplace')} {index + 1}
                </Text>
                {draft.experience.length > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    className="min-h-11 justify-center px-2"
                    onPress={() =>
                      update({
                        experience: draft.experience.filter(
                          (row) => row.id !== item.id
                        ),
                      })
                    }
                  >
                    <Text className="text-sm text-red-500">
                      {label('remove')}
                    </Text>
                  </Pressable>
                )}
              </View>
              {experienceFields.map((key) => (
                <Field
                  key={key}
                  label={label(key)}
                  value={item[key]}
                  onChangeText={(value) =>
                    update({
                      experience: draft.experience.map((row) =>
                        row.id === item.id ? { ...row, [key]: value } : row
                      ),
                    })
                  }
                  multiline={key === 'duties' || key === 'achievements'}
                  placeholder={
                    key === 'start' || key === 'end'
                      ? label('dateHint')
                      : undefined
                  }
                />
              ))}
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              update({
                experience: [
                  ...draft.experience,
                  emptyExperience(
                    Math.max(...draft.experience.map((item) => item.id)) + 1
                  ),
                ],
              })
            }
            className="mb-7 min-h-12 items-center justify-center rounded-xl border border-blue-200 px-4 dark:border-blue-800"
          >
            <Text className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              + {label('addExperience')}
            </Text>
          </Pressable>
        </>
      )}
      {(['skills', 'education', 'languages', 'location'] as const).map(
        (key) => (
          <Field
            key={key}
            label={label(key)}
            value={draft[key]}
            onChangeText={(value) => update({ [key]: value })}
            multiline={key === 'skills' || key === 'education'}
            placeholder={label(`${key}Hint`)}
          />
        )
      )}
      <ChipSelector
        label={t('upload.jobLocation.label')}
        options={['home', 'abroad'] as const}
        selectedValue={draft.jobLocation}
        onSelect={(jobLocation) => update({ jobLocation })}
        translationKey="upload.jobLocation.options"
        namespace="guest"
        variant="outline"
        classNameSelector="mb-6"
      />
      <Field
        label={t('upload.targetCountry.label')}
        value={draft.targetCountry}
        onChangeText={(targetCountry) => update({ targetCountry })}
        placeholder={t('upload.targetCountry.placeholder')}
      />
      <ResumeConsent
        value={draft.consent}
        onChange={(consent) => update({ consent })}
        from="/no-resume"
      />
      {validation && missingFields && (
        <Text accessibilityRole="alert" className="mb-4 text-sm text-red-500">
          {label('required')}
        </Text>
      )}
      {validation && !draft.consent && (
        <Text accessibilityRole="alert" className="mb-4 text-sm text-red-500">
          {t('upload.errors.missingConsent')}
        </Text>
      )}
      {error && (
        <Text accessibilityRole="alert" className="mb-4 text-sm text-red-500">
          {t(`analysis.errors.${error}`, {
            defaultValue: t('analysis.errors.processing_failed'),
          })}
        </Text>
      )}
      <PrimaryButton onPress={handleSubmit} isLoading={submitting}>
        {t('upload.submit')}
      </PrimaryButton>
    </ResumeFormLayout>
  );
}
