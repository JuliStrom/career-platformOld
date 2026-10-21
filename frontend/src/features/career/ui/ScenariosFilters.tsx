import type {
  DirectionFilterValue,
  IScenariosFilters,
  IsActiveFilterValue,
  LevelFilterValue,
  ScenariosFiltersFormValues,
} from '@/features/career/model';
import { scenariosFiltersFormSchema } from '@/features/career/model/schemas';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { FilterSecondaryButton } from '@/shared/ui/buttons/FilterSecondaryButton';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { ChipSelector } from '@/shared/ui/selectors/ChipSelector';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import {
  DIRECTION_FILTER_VALUES,
  IS_ACTIVE_FILTER_VALUES,
  LEVEL_FILTER_VALUES,
} from '../model/constants';
import { Direction, Level } from '@/shared/model';

interface ScenariosFiltersProps {
  filters: IScenariosFilters;
  isLoading: boolean;
  onChange: (partial: Partial<IScenariosFilters>) => void;
  onApply: () => void;
  onReset: () => void;
}

export function ScenariosFilters({
  filters,
  isLoading,
  onChange,
  onApply,
  onReset,
}: ScenariosFiltersProps) {
  const { t } = useTranslation('career');
  const { colorScheme } = useColorScheme();

  const [isExpanded, setIsExpanded] = useState(false);

  const { control, handleSubmit, reset } = useForm<ScenariosFiltersFormValues>({
    resolver: zodResolver(scenariosFiltersFormSchema),
    defaultValues: {
      direction: filters.direction ?? 'All',
      level: filters.level ?? 'All',
      isActive:
        filters.isActive !== undefined
          ? filters.isActive
            ? 'Active'
            : 'Inactive'
          : 'All',
    },
    mode: 'onChange',
  });

  const watchedValues = useWatch({ control });
  const watchedDirection = watchedValues.direction ?? 'All';
  const watchedLevel = watchedValues.level ?? 'All';
  const watchedIsActive = watchedValues.isActive ?? 'All';

  useEffect(() => {
    reset({
      direction: filters.direction ?? 'All',
      level: filters.level ?? 'All',
      isActive:
        filters.isActive !== undefined
          ? filters.isActive
            ? 'Active'
            : 'Inactive'
          : 'All',
    });
  }, [filters, reset]);

  const activeCount =
    (watchedDirection !== 'All' ? 1 : 0) +
    (watchedLevel !== 'All' ? 1 : 0) +
    (watchedIsActive !== 'All' ? 1 : 0);

  const handleFormSubmit = (data: ScenariosFiltersFormValues) => {
    const partial: Partial<IScenariosFilters> = {
      direction:
        data.direction === 'All'
          ? undefined
          : (data.direction as unknown as Direction),
      level:
        data.level === 'All' ? undefined : (data.level as unknown as Level),
      isActive:
        data.isActive === 'All' ? undefined : data.isActive === 'Active',
    };
    onChange(partial);
    onApply();
  };

  const handleReset = () => {
    reset({
      direction: 'All',
      level: 'All',
      isActive: 'All',
    });
    onReset();
  };

  return (
    <View className="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <Pressable
        onPress={() => setIsExpanded((prev) => !prev)}
        className="flex-row items-center justify-between"
        accessibilityRole="button"
        accessibilityLabel={t('scenarios.filters.title')}
      >
        <View className="flex-row items-center">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('scenarios.filters.title')}
          </Text>
          {activeCount > 0 && (
            <Text className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              {activeCount}
            </Text>
          )}
        </View>
        <View className="items-center justify-center">
          <MaterialIcons
            name={isExpanded ? 'arrow-drop-up' : 'arrow-drop-down'}
            size={30}
            color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
          />
        </View>
      </Pressable>

      {isExpanded && (
        <>
          <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('scenarios.filters.hint')}
          </Text>

          <View className="mt-3">
            <Controller
              control={control}
              name="direction"
              render={({ field: { onChange, value } }) => (
                <ChipSelector<DirectionFilterValue>
                  label={t('scenarios.filters.direction')}
                  options={DIRECTION_FILTER_VALUES}
                  selectedValue={(value ?? 'All') as DirectionFilterValue}
                  onSelect={onChange}
                  translationKey="directions"
                  namespace="career"
                />
              )}
            />

            <Controller
              control={control}
              name="level"
              render={({ field: { onChange, value } }) => (
                <ChipSelector<LevelFilterValue>
                  label={t('scenarios.filters.level')}
                  options={LEVEL_FILTER_VALUES}
                  selectedValue={(value ?? 'All') as LevelFilterValue}
                  onSelect={onChange}
                  translationKey="levels"
                  namespace="profile"
                />
              )}
            />

            <Controller
              control={control}
              name="isActive"
              render={({ field: { onChange, value } }) => (
                <ChipSelector<IsActiveFilterValue>
                  label={t('scenarios.filters.isActive')}
                  options={IS_ACTIVE_FILTER_VALUES}
                  selectedValue={(value ?? 'All') as IsActiveFilterValue}
                  onSelect={onChange}
                  translationKey="isActive"
                  namespace="career"
                />
              )}
            />
          </View>

          <View className="mt-1 flex-row gap-2">
            <View className="min-w-0 flex-1">
              <PrimaryButton
                onPress={handleSubmit(handleFormSubmit)}
                accessibilityLabel={t('scenarios.filters.apply')}
                className="mb-0 w-full"
                isLoading={isLoading}
              >
                {t('scenarios.filters.apply')}
              </PrimaryButton>
            </View>
            <View className="min-w-0 flex-1">
              <FilterSecondaryButton
                label={t('scenarios.filters.reset')}
                onPress={handleReset}
                accessibilityLabel={t('scenarios.filters.reset')}
                className="w-full"
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
}
