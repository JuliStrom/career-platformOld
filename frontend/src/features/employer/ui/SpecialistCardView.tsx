import type { SpecialistCard } from '@/features/employer/model';
import { AvatarSection } from '@/features/profile/ui/AvatarSection';
import { CareerGoalSelector } from '@/features/profile/ui/CareerGoalSelector';
import { ExperienceCard } from '@/features/profile/ui/ExperienceCard';
import { SkillsTagList } from '@/features/profile/ui/SkillsTagList';
import { normalizeProfileDirections } from '@/features/profile/utils/directions.utils';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { CareerGoal, City, EmployerContactKind } from '@/shared/model';
import { NamedField } from '@/shared/ui';
import { FilterSecondaryButton } from '@/shared/ui/buttons/FilterSecondaryButton';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

interface SpecialistCardViewProps {
  item: SpecialistCard;
  isContacting: boolean;
  onContact: (kind: EmployerContactKind, message?: string) => Promise<void>;
}

function previewText(value: string, max = 160) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function SpecialistCardView({
  item,
  isContacting,
  onContact,
}: SpecialistCardViewProps) {
  const { t } = useTranslation('employer');
  const { t: tProfile } = useTranslation('profile');
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [kind, setKind] = useState<EmployerContactKind | null>(null);

  const handleSend = async () => {
    if (!kind) return;
    await onContact(kind, message.trim() || undefined);
    setKind(null);
    setMessage('');
  };

  const directions = normalizeProfileDirections(item.directions);
  const aboutMe = item.aboutMe?.trim() ?? '';
  const experiencePreview = item.experience?.trim() ?? '';
  const hasExperiencePreview = Boolean(
    item.currentCompany || experiencePreview
  );

  return (
    <View className="mb-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
      >
        <View className="flex-row items-start gap-3">
          <AvatarSection
            avatar={item.avatar ?? undefined}
            name={item.name}
            className="mb-0 shrink-0"
            sizeClassName="h-16 w-16"
          />
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {item.name}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {directions.map((itemDirection) => (
                <View
                  key={itemDirection}
                  className="rounded-full bg-blue-100 px-3 py-1.5 dark:bg-blue-900"
                >
                  <Text className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    {tProfile(`directions.${itemDirection}`)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        {aboutMe ? (
          <View className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
            <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {tProfile('aboutMe')}
            </Text>
            <Text className="text-sm leading-5 text-gray-700 dark:text-gray-200">
              {expanded ? aboutMe : previewText(aboutMe)}
            </Text>
          </View>
        ) : null}
        {!expanded && hasExperiencePreview ? (
          <View className="mt-3">
            <Text className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
              {tProfile('experience')}
            </Text>
            {item.currentCompany ? (
              <Text className="mb-1 text-sm text-gray-700 dark:text-gray-200">
                {tProfile('currentCompany')}: {item.currentCompany}
              </Text>
            ) : null}
            {experiencePreview ? (
              <Text className="text-sm leading-5 text-gray-700 dark:text-gray-200">
                {previewText(experiencePreview)}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-300">
          {t(expanded ? 'specialists.showLess' : 'specialists.showMore')}
        </Text>
      </Pressable>

      {expanded ? (
        <View className="mt-3">
          <View className="flex-row flex-wrap gap-2">
            <View className="min-w-[120px] flex-1 rounded-xl bg-purple-50 p-3 dark:bg-purple-950/50">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                {t('specialists.level')}
              </Text>
              <View className="self-start rounded-full bg-purple-100 px-3 py-1.5 dark:bg-purple-900">
                <Text className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                  {tProfile(`levels.${item.level}`)}
                </Text>
              </View>
            </View>
            {item.city ? (
              <View className="min-w-[120px] flex-1 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  {t('specialists.city')}
                </Text>
                <View className="self-start rounded-full bg-amber-100 px-3 py-1.5 dark:bg-amber-900">
                  <Text className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    {tProfile(`cities.${item.city}`)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View className="mt-3">
            <CareerGoalSelector careerGoal={item.careerGoal as CareerGoal} />
          </View>

          <View className="mb-4 gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
            {item.employmentType ? (
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {t('specialists.employment')}:{' '}
                {tProfile(`employmentTypes.${item.employmentType}`)}
              </Text>
            ) : null}
            <Text className="text-sm text-gray-700 dark:text-gray-200">
              {tProfile(`relocationOptions.${item.wantsRelocation === true}`)}
              {item.wantsRelocation && item.relocationToCountry
                ? ` · ${tProfile(`relocationCountries.${item.relocationToCountry}`, { defaultValue: item.relocationToCountry })}`
                : ''}
            </Text>
            {item.city === City.Abroad && item.relocationFromCity ? (
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {tProfile('relocationFromCity')}:{' '}
                {tProfile(`relocationOrigins.${item.relocationFromCity}`)}
              </Text>
            ) : null}
          </View>

          <SkillsTagList skills={item.skills} />

          <ExperienceCard
            profile={{
              experience: item.experience ?? '',
              workplaces: item.workplaces ?? [],
              projects: item.projects ?? [],
              careerStartDate: item.careerStartDate,
              currentCompany: item.currentCompany,
              currentPosition: item.currentPosition,
              currentAchievement: item.currentAchievement,
            }}
          />

          {kind ? (
            <View className="mt-1">
              <NamedField
                label={
                  kind === EmployerContactKind.ProjectOffer
                    ? t('specialists.offer')
                    : t('specialists.write')
                }
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
                placeholder={t('specialists.messagePlaceholder')}
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FilterSecondaryButton
                    label={t('specialists.cancel')}
                    onPress={() => {
                      setKind(null);
                      setMessage('');
                    }}
                  />
                </View>
                <View className="flex-1">
                  <PrimaryButton
                    className="mb-0"
                    isLoading={isContacting}
                    onPress={() => void handleSend()}
                  >
                    {t('specialists.send')}
                  </PrimaryButton>
                </View>
              </View>
            </View>
          ) : (
            <View className="mt-1 flex-row gap-3">
              <View className="flex-1">
                <FilterSecondaryButton
                  label={t('specialists.write')}
                  onPress={() => setKind(EmployerContactKind.Message)}
                />
              </View>
              <View className="flex-1">
                <PrimaryButton
                  className="mb-0"
                  onPress={() => setKind(EmployerContactKind.ProjectOffer)}
                >
                  {t('specialists.offer')}
                </PrimaryButton>
              </View>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
