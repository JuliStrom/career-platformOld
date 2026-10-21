import type { EducationsFilters } from '@/features/education/api/education.api';
import {
  EDUCATION_DIRECTION_OPTIONS,
  EDUCATION_FORMAT_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  EDUCATION_LOCATION_OPTIONS,
  EDUCATION_PRICE_OPTIONS,
  EDUCATION_TYPE_OPTIONS,
} from '@/features/education/model/constants';
import { FilterSecondaryButton } from '@/shared/ui/buttons/FilterSecondaryButton';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { ChipSelector } from '@/shared/ui/selectors/ChipSelector';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

interface EducationsFiltersPanelProps {
  filters: EducationsFilters;
  isLoading: boolean;
  onApply: (filters: EducationsFilters) => void;
  onReset: () => void;
  t: (key: string) => string;
}

export function EducationsFiltersPanel({
  filters,
  isLoading,
  onApply,
  onReset,
  t,
}: EducationsFiltersPanelProps) {
  const { colorScheme } = useColorScheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [draft, setDraft] = useState<EducationsFilters>(filters);

  const activeCount = Object.values(filters).filter(Boolean).length;

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  function setDraftValue<K extends keyof EducationsFilters>(
    key: K,
    value: EducationsFilters[K] | 'All'
  ) {
    setDraft((prev) => ({
      ...prev,
      [key]: value === 'All' ? undefined : value,
    }));
  }

  function handleReset() {
    setDraft({});
    onReset();
  }

  return (
    <View className="mb-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
      <Pressable
        onPress={() => setIsExpanded((prev) => !prev)}
        className="flex-row items-center justify-between"
        accessibilityRole="button"
        accessibilityLabel={t('educations.filters.title')}
      >
        <View className="flex-row items-center">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('educations.filters.title')}
          </Text>
          {activeCount > 0 && (
            <Text className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              {activeCount}
            </Text>
          )}
        </View>
        <MaterialIcons
          name={isExpanded ? 'arrow-drop-up' : 'arrow-drop-down'}
          size={30}
          color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
        />
      </Pressable>

      {isExpanded && (
        <>
          <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('educations.filters.hint')}
          </Text>

          <View className="mt-3">
            <ChipSelector
              label={t('educations.filters.direction')}
              options={EDUCATION_DIRECTION_OPTIONS}
              selectedValue={
                (draft.direction ??
                  'All') as (typeof EDUCATION_DIRECTION_OPTIONS)[number]
              }
              onSelect={(value) => setDraftValue('direction', value)}
              translationKey="directions"
              namespace="career"
            />
            <ChipSelector
              label={t('educations.filters.type')}
              options={EDUCATION_TYPE_OPTIONS}
              selectedValue={
                (draft.type ?? 'All') as (typeof EDUCATION_TYPE_OPTIONS)[number]
              }
              onSelect={(value) => setDraftValue('type', value)}
              translationKey="educations.filterTypes"
              namespace="common"
            />
            <ChipSelector
              label={t('educations.filters.format')}
              options={EDUCATION_FORMAT_OPTIONS}
              selectedValue={
                (draft.locationType ??
                  'All') as (typeof EDUCATION_FORMAT_OPTIONS)[number]
              }
              onSelect={(value) => setDraftValue('locationType', value)}
              translationKey="educations.filterFormats"
              namespace="common"
            />
            <ChipSelector
              label={t('educations.filters.location')}
              options={EDUCATION_LOCATION_OPTIONS}
              selectedValue={
                (draft.location ??
                  'All') as (typeof EDUCATION_LOCATION_OPTIONS)[number]
              }
              onSelect={(value) => setDraftValue('location', value)}
              translationKey="educations.filterLocations"
              namespace="common"
            />
            <ChipSelector
              label={t('educations.filters.price')}
              options={EDUCATION_PRICE_OPTIONS}
              selectedValue={
                (draft.price ??
                  'All') as (typeof EDUCATION_PRICE_OPTIONS)[number]
              }
              onSelect={(value) => setDraftValue('price', value)}
              translationKey="educations.filterPrices"
              namespace="common"
            />
            <ChipSelector
              label={t('educations.filters.level')}
              options={EDUCATION_LEVEL_OPTIONS}
              selectedValue={
                (draft.level ??
                  'All') as (typeof EDUCATION_LEVEL_OPTIONS)[number]
              }
              onSelect={(value) => setDraftValue('level', value)}
              translationKey="educations.filterLevels"
              namespace="common"
            />
          </View>

          <View className="mt-1 flex-row gap-2">
            <View className="min-w-0 flex-1">
              <PrimaryButton
                onPress={() => onApply(draft)}
                accessibilityLabel={t('educations.filters.apply')}
                className="mb-0 w-full"
                isLoading={isLoading}
              >
                {t('educations.filters.apply')}
              </PrimaryButton>
            </View>
            <View className="min-w-0 flex-1">
              <FilterSecondaryButton
                label={t('educations.filters.reset')}
                onPress={handleReset}
                accessibilityLabel={t('educations.filters.reset')}
                className="w-full"
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
}
