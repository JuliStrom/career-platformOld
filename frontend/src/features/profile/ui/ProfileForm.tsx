import {
  CAREER_GOAL_VALUES,
  CAREER_CHANGE_AGE_WITH_SKIP,
  CAREER_CHANGE_MOTIVATION_VALUES,
  CAREER_CHANGE_TIMELINE_VALUES,
  CareerChangeMotivation,
  CareerChangeTimeline,
  CareerGoal,
  CITY_VALUES,
  City,
  Direction,
  EMPLOYMENT_TYPE_VALUES,
  EmploymentType,
  Level,
  Profile,
  ProfileLang,
  profileFormSchema,
  DIRECTION_VALUES,
  LEVEL_VALUES,
  type ProfileFormValues,
} from '@/features/profile/model';
import { SkillsAutosuggest } from '@/features/profile/ui/SkillsAutosuggest';
import { ExperienceSection } from '@/features/profile/ui/ExperienceSection';
import {
  currentProjectsFromProfile,
  formatCurrentPeriod,
  parsePeriodStartDate,
  summarizeExperience,
  workplacesFromProfile,
} from '@/features/profile/utils/experience.utils';
import {
  MAX_PROFILE_DIRECTIONS,
  normalizeProfileDirections,
  toggleProfileDirection,
} from '@/features/profile/utils/directions.utils';
import { ProfileAvatarUpload } from '@/features/profile/ui/ProfileAvatarUpload';
import i18n from '@/shared/config/i18n';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { NamedField } from '@/shared/ui/inputs/NamedField';
import { ChipSelector } from '@/shared/ui/selectors/ChipSelector';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { getProfilePrefill } from '../api/prefill.api';
import { canPrefillProfileField } from '../utils/prefill.utils';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ProfileFormProps {
  initialValues?: Profile;
  onSubmit: (values: Profile) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  submitButtonText: string;
  submitButtonLabel: string;
  title: string;
  showCancelButton?: boolean;
  onCancel?: () => void;
  cancelButtonText?: string;
  onDeleteAvatar?: () => Promise<void>;
  isDeletingAvatar?: boolean;
}

const RELOCATION_TO_COUNTRY_VALUES = [
  'usa',
  'canada',
  'germany',
  'russia',
  'china',
  'dubai',
  'europe',
  'other',
] as const;

const RELOCATION_FROM_VALUES = ['kazakhstan'] as const;

export function ProfileForm({
  initialValues,
  onSubmit,
  isLoading = false,
  error: externalError,
  submitButtonText,
  submitButtonLabel,
  title,
  showCancelButton = false,
  onCancel,
  cancelButtonText,
  onDeleteAvatar,
  isDeletingAvatar = false,
}: ProfileFormProps) {
  const { t } = useTranslation('profile');
  const userId = useAuthStore((state) => state.user?.id);
  const [prefilled, setPrefilled] = useState(false);

  const {
    control,
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    getValues,
    getFieldState,
    setValue,
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      aboutMe: initialValues?.aboutMe ?? '',
      avatar: initialValues?.avatar ?? '',
      directions: normalizeProfileDirections(
        initialValues?.directions ?? Direction.IT
      ),
      level: initialValues?.level ?? Level.Junior,
      skills: initialValues?.skills ?? [],
      experience: initialValues?.experience ?? '',
      workplaces: workplacesFromProfile(initialValues),
      projects: currentProjectsFromProfile(initialValues),
      careerGoal: initialValues?.careerGoal ?? CareerGoal.Growth,
      careerStartDateInput: formatCurrentPeriod(initialValues?.careerStartDate),
      currentCompany: initialValues?.currentCompany ?? '',
      currentPosition: initialValues?.currentPosition ?? '',
      currentAchievement: initialValues?.currentAchievement ?? '',
      city: initialValues?.city ?? null,
      relocationFromCity: initialValues?.relocationFromCity ?? null,
      relocationToCountry: initialValues?.relocationToCountry ?? null,
      employmentType: initialValues?.employmentType ?? null,
      lang: initialValues?.lang ?? ProfileLang.RU,
      wantsRelocation: initialValues?.wantsRelocation ?? false,
      careerChangeTrackActive: initialValues?.careerChangeTrackActive ?? false,
      careerChangeCurrentField: initialValues?.careerChangeCurrentField ?? '',
      careerChangeTargetDirection:
        initialValues?.careerChangeTargetDirection ?? Direction.IT,
      careerChangeAgeRange:
        initialValues?.careerChangeAgeRange != null
          ? initialValues.careerChangeAgeRange
          : 'skip',
      careerChangeMotivation:
        initialValues?.careerChangeMotivation ?? CareerChangeMotivation.Other,
      careerChangeTimeline:
        initialValues?.careerChangeTimeline ??
        CareerChangeTimeline.JustStudying,
    },
    mode: 'onBlur',
  });

  const initialValuesSyncKey = initialValues
    ? JSON.stringify({
        name: initialValues.name,
        aboutMe: initialValues.aboutMe,
        avatar: initialValues.avatar,
        directions: initialValues.directions,
        skills: initialValues.skills,
        workplaces: initialValues.workplaces,
        projects: initialValues.projects,
        careerStartDate: initialValues.careerStartDate,
        currentCompany: initialValues.currentCompany,
        currentPosition: initialValues.currentPosition,
        currentAchievement: initialValues.currentAchievement,
      })
    : '';
  const lastSyncedKey = useRef<string>('');

  useEffect(() => {
    if (!initialValues || lastSyncedKey.current === initialValuesSyncKey)
      return;
    lastSyncedKey.current = initialValuesSyncKey;

    reset({
      ...initialValues,
      aboutMe: initialValues.aboutMe ?? '',
      avatar: initialValues.avatar ?? '',
      directions: normalizeProfileDirections(
        initialValues.directions ?? Direction.IT
      ),
      skills: initialValues.skills ?? [],
      experience: initialValues.experience ?? '',
      workplaces: workplacesFromProfile(initialValues),
      projects: currentProjectsFromProfile(initialValues),
      careerStartDateInput: formatCurrentPeriod(initialValues.careerStartDate),
      currentCompany: initialValues.currentCompany ?? '',
      currentPosition: initialValues.currentPosition ?? '',
      currentAchievement: initialValues.currentAchievement ?? '',
      city: initialValues.city ?? null,
      relocationFromCity: initialValues.relocationFromCity ?? null,
      relocationToCountry: initialValues.relocationToCountry ?? null,
      employmentType: initialValues.employmentType ?? null,
      lang: initialValues.lang ?? ProfileLang.RU,
      wantsRelocation: initialValues.wantsRelocation ?? false,
      careerChangeTrackActive: initialValues.careerChangeTrackActive ?? false,
      careerChangeCurrentField: initialValues.careerChangeCurrentField ?? '',
      careerChangeTargetDirection:
        initialValues.careerChangeTargetDirection ?? Direction.IT,
      careerChangeAgeRange:
        initialValues.careerChangeAgeRange != null
          ? initialValues.careerChangeAgeRange
          : 'skip',
      careerChangeMotivation:
        initialValues.careerChangeMotivation ?? CareerChangeMotivation.Other,
      careerChangeTimeline:
        initialValues.careerChangeTimeline ?? CareerChangeTimeline.JustStudying,
    });
  }, [initialValues, initialValuesSyncKey, reset]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void getProfilePrefill()
      .then(({ analysisId, values }) => {
        if (cancelled || !analysisId) return;
        const { careerStartDate, ...fields } = values;
        const suggestions: Partial<ProfileFormValues> = { ...fields };
        if (careerStartDate)
          suggestions.careerStartDateInput =
            formatCurrentPeriod(careerStartDate);
        let applied = false;
        for (const field of Object.keys(
          suggestions
        ) as (keyof ProfileFormValues)[]) {
          const value = suggestions[field];
          const saved =
            field === 'careerStartDateInput'
              ? initialValues?.careerStartDate
              : initialValues?.[field as keyof Profile];
          const current = getValues(field);
          const defaultSelection =
            !initialValues && (field === 'level' || field === 'directions');
          const state = getFieldState(field);
          if (
            !canPrefillProfileField(
              value,
              current,
              saved,
              state.isDirty || state.isTouched,
              defaultSelection
            )
          )
            continue;
          setValue(field, value, { shouldDirty: false, shouldValidate: false });
          applied = true;
        }
        if (applied) setPrefilled(true);
      })
      .catch(() => {
        /* Manual profile entry remains available if suggestions cannot be loaded. */
      });
    return () => {
      cancelled = true;
    };
  }, [
    userId,
    initialValues,
    initialValuesSyncKey,
    getValues,
    getFieldState,
    setValue,
  ]);

  const watchedName = useWatch({ control, name: 'name', defaultValue: '' });
  const watchedCity = useWatch({ control, name: 'city', defaultValue: null });
  const careerChangeTrackActive = useWatch({
    control,
    name: 'careerChangeTrackActive',
    defaultValue: false,
  });
  const baselineServerAvatar = initialValues?.avatar?.trim() ?? '';

  const handleSubmit = async (data: ProfileFormValues) => {
    const payload: Profile = {
      name: data.name.trim(),
      aboutMe: data.aboutMe?.trim() ?? '',
      avatar:
        typeof data.avatar === 'string' && data.avatar.trim()
          ? data.avatar.trim()
          : undefined,
      directions: normalizeProfileDirections(data.directions),
      level: data.level,
      skills: data.skills,
      workplaces: (data.workplaces ?? []).map((place) => ({
        ...place,
        projects: (place.projects ?? []).map((project) => ({
          ...project,
          link: project.link ?? '',
        })),
      })),
      projects: (data.projects ?? []).map((project) => ({
        ...project,
        link: project.link ?? '',
      })),
      experience: summarizeExperience(
        (data.workplaces ?? []).map((place) => ({
          ...place,
          projects: (place.projects ?? []).map((project) => ({
            ...project,
            link: project.link ?? '',
          })),
        })),
        (data.projects ?? []).map((project) => ({
          ...project,
          link: project.link ?? '',
        }))
      ),
      careerGoal: data.careerGoal,
      careerStartDate:
        parsePeriodStartDate(data.careerStartDateInput ?? '')?.toISOString() ??
        null,
      currentCompany:
        data.currentCompany && data.currentCompany.trim().length > 0
          ? data.currentCompany.trim()
          : null,
      currentPosition:
        data.currentPosition && data.currentPosition.trim().length > 0
          ? data.currentPosition.trim()
          : null,
      currentAchievement:
        data.currentAchievement && data.currentAchievement.trim().length > 0
          ? data.currentAchievement.trim()
          : null,
      city: data.city ?? null,
      relocationFromCity:
        data.city === City.Abroad
          ? (data.relocationFromCity ?? 'kazakhstan')
          : null,
      relocationToCountry:
        data.city === City.Abroad
          ? (data.relocationToCountry ?? 'europe')
          : null,
      employmentType: data.employmentType ?? null,
      lang:
        i18n.language?.slice(0, 2) === 'en' ? ProfileLang.EN : ProfileLang.RU,
      wantsRelocation: Boolean(data.wantsRelocation),
      careerChangeTrackActive: Boolean(data.careerChangeTrackActive),
      careerChangeCurrentField: data.careerChangeTrackActive
        ? (data.careerChangeCurrentField ?? '').trim()
        : '',
      careerChangeTargetDirection: data.careerChangeTrackActive
        ? data.careerChangeTargetDirection!
        : undefined,
      careerChangeAgeRange:
        !data.careerChangeTrackActive ||
        data.careerChangeAgeRange === 'skip' ||
        data.careerChangeAgeRange == null
          ? 'skip'
          : data.careerChangeAgeRange,
      careerChangeMotivation: data.careerChangeTrackActive
        ? data.careerChangeMotivation!
        : undefined,
      careerChangeTimeline: data.careerChangeTrackActive
        ? data.careerChangeTimeline!
        : undefined,
    };

    await onSubmit(payload);
  };

  const displayError = errors.root?.message ?? externalError;

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            className="mb-6 text-xl font-semibold text-gray-900 dark:text-white"
            accessibilityRole="header"
          >
            {title}
          </Text>
          {prefilled && (
            <Text className="mb-6 text-sm leading-5 text-blue-700 dark:text-blue-300">
              {t('analysisPrefill')}
            </Text>
          )}

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <NamedField
                label={t('name')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('name')}
                autoCapitalize="words"
                error={errors.name?.message}
                touched={fieldState.isTouched}
              />
            )}
          />

          <Controller
            control={control}
            name="aboutMe"
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <NamedField
                label={t('aboutMe')}
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('aboutMePlaceholder')}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                error={errors.aboutMe?.message}
                touched={fieldState.isTouched}
                margin="mb-1"
                inputClassName="min-h-[96px] rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            )}
          />
          <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {t('aboutMeHint')}
          </Text>

          <Controller
            control={control}
            name="avatar"
            render={({ field: { onChange, value }, fieldState }) => (
              <ProfileAvatarUpload
                value={typeof value === 'string' ? value : ''}
                onChange={onChange}
                baselineServerAvatar={baselineServerAvatar}
                displayName={typeof watchedName === 'string' ? watchedName : ''}
                disabled={isLoading}
                isDeleting={isDeletingAvatar}
                onDeleteServerAvatar={onDeleteAvatar}
                fieldError={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="directions"
            render={({ field: { onChange, value } }) => (
              <ChipSelector
                label={t('direction')}
                hint={t('directionHint')}
                options={DIRECTION_VALUES}
                selectedValues={normalizeProfileDirections(value)}
                onSelect={(selected) =>
                  onChange(
                    toggleProfileDirection(
                      normalizeProfileDirections(value),
                      selected as Direction
                    )
                  )
                }
                maxSelected={MAX_PROFILE_DIRECTIONS}
                translationKey="directions"
              />
            )}
          />

          <Controller
            control={control}
            name="level"
            render={({ field: { onChange, value } }) => (
              <ChipSelector
                label={t('level')}
                options={LEVEL_VALUES}
                selectedValue={value}
                onSelect={onChange}
                translationKey="levels"
              />
            )}
          />

          <Controller
            control={control}
            name="skills"
            render={({ field: { onChange, value }, fieldState }) => (
              <SkillsAutosuggest
                value={value ?? []}
                onChange={onChange}
                error={errors.skills?.message}
                touched={fieldState.isTouched || (value?.length ?? 0) > 0}
              />
            )}
          />

          <ExperienceSection
            control={control}
            errors={errors}
            getValues={getValues}
          />

          <Controller
            control={control}
            name="careerGoal"
            render={({ field: { onChange, value } }) => (
              <ChipSelector
                label={t('careerGoal')}
                options={CAREER_GOAL_VALUES}
                selectedValue={value}
                onSelect={onChange}
                translationKey="careerGoals"
                classNameSelector="mb-6"
              />
            )}
          />

          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, value } }) => (
              <ChipSelector
                label={t('city')}
                options={CITY_VALUES}
                selectedValue={(value ?? City.Almaty) as City}
                onSelect={onChange}
                translationKey="cities"
              />
            )}
          />

          {watchedCity === City.Abroad ? (
            <View className="mb-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
              <Controller
                control={control}
                name="relocationFromCity"
                render={({ field: { onChange, value } }) => (
                  <ChipSelector
                    label={t('relocationFromCity')}
                    options={RELOCATION_FROM_VALUES}
                    selectedValue={value ?? 'kazakhstan'}
                    onSelect={onChange}
                    translationKey="relocationOrigins"
                    classNameSelector="mb-4"
                  />
                )}
              />
              <Controller
                control={control}
                name="relocationToCountry"
                render={({ field: { onChange, value } }) => (
                  <ChipSelector
                    label={t('relocationToCountry')}
                    options={RELOCATION_TO_COUNTRY_VALUES}
                    selectedValue={value ?? 'europe'}
                    onSelect={onChange}
                    translationKey="relocationCountries"
                    classNameSelector="mb-0"
                  />
                )}
              />
            </View>
          ) : null}

          <Controller
            control={control}
            name="employmentType"
            render={({ field: { onChange, value } }) => (
              <ChipSelector
                label={t('employmentType')}
                options={EMPLOYMENT_TYPE_VALUES}
                selectedValue={
                  (value ?? EmploymentType.Fulltime) as EmploymentType
                }
                onSelect={onChange}
                translationKey="employmentTypes"
              />
            )}
          />

          <Controller
            control={control}
            name="wantsRelocation"
            render={({ field: { onChange, value } }) => (
              <ChipSelector
                label={t('wantsRelocation')}
                options={['true', 'false']}
                selectedValue={value ? 'true' : 'false'}
                onSelect={(selected) => onChange(selected === 'true')}
                translationKey="relocationOptions"
              />
            )}
          />

          <View className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/80 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
            <Text className="mb-1 text-base font-semibold text-indigo-950 dark:text-indigo-100">
              {t('careerChange.sectionTitle')}
            </Text>
            <Text className="mb-4 text-sm leading-5 text-indigo-900/90 dark:text-indigo-200/90">
              {t('careerChange.sectionHint')}
            </Text>
            <Controller
              control={control}
              name="careerChangeTrackActive"
              render={({ field: { value, onChange } }) => (
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="mr-3 flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                    {t('careerChange.toggleLabel')}
                  </Text>
                  <Switch
                    accessibilityLabel={t('careerChange.toggleLabel')}
                    value={value}
                    onValueChange={onChange}
                  />
                </View>
              )}
            />
            {careerChangeTrackActive ? (
              <>
                <Controller
                  control={control}
                  name="careerChangeCurrentField"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState,
                  }) => (
                    <NamedField
                      label={t('careerChange.currentField')}
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder={t('careerChange.currentFieldPlaceholder')}
                      margin="mb-4"
                      error={errors.careerChangeCurrentField?.message}
                      touched={fieldState.isTouched}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="careerChangeTargetDirection"
                  render={({ field: { onChange, value } }) => (
                    <ChipSelector
                      label={t('careerChange.targetDirection')}
                      options={DIRECTION_VALUES}
                      selectedValue={value ?? Direction.IT}
                      onSelect={onChange}
                      translationKey="directions"
                      classNameSelector="mb-4"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="careerChangeAgeRange"
                  render={({ field: { onChange, value } }) => (
                    <ChipSelector
                      label={t('careerChange.ageRange')}
                      options={[...CAREER_CHANGE_AGE_WITH_SKIP]}
                      selectedValue={value ?? 'skip'}
                      onSelect={onChange}
                      translationKey="careerChange.ageRanges"
                      classNameSelector="mb-4"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="careerChangeMotivation"
                  render={({ field: { onChange, value } }) => (
                    <ChipSelector
                      label={t('careerChange.motivation')}
                      options={CAREER_CHANGE_MOTIVATION_VALUES}
                      selectedValue={value ?? CareerChangeMotivation.Other}
                      onSelect={onChange}
                      translationKey="careerChange.motivations"
                      classNameSelector="mb-4"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="careerChangeTimeline"
                  render={({ field: { onChange, value } }) => (
                    <ChipSelector
                      label={t('careerChange.timeline')}
                      options={CAREER_CHANGE_TIMELINE_VALUES}
                      selectedValue={value ?? CareerChangeTimeline.JustStudying}
                      onSelect={onChange}
                      translationKey="careerChange.timelines"
                      classNameSelector="mb-4"
                    />
                  )}
                />
              </>
            ) : null}
          </View>

          {displayError && (
            <Text className="mb-4 text-sm text-red-600 dark:text-red-400">
              {displayError}
            </Text>
          )}

          <View className="flex-row items-stretch gap-3">
            {showCancelButton && (
              <View className="flex-1">
                <PrimaryButton
                  onPress={onCancel}
                  accessibilityLabel={cancelButtonText}
                  className="mb-0 border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                  textClassName="text-center text-base font-semibold text-gray-700 dark:text-gray-300"
                  disabled={isLoading}
                >
                  {cancelButtonText}
                </PrimaryButton>
              </View>
            )}
            <View className="flex-1">
              <PrimaryButton
                onPress={rhfHandleSubmit(handleSubmit)}
                disabled={isLoading}
                isLoading={isLoading}
                accessibilityLabel={submitButtonLabel}
                className="mb-0"
              >
                {submitButtonText}
              </PrimaryButton>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
