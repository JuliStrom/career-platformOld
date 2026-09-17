import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import {
  CITY_VALUES,
  DIRECTION_VALUES,
  LEVEL_VALUES,
  SPECIALIST_WORK_FORMAT_VALUES,
} from '@/shared/model';
import {
  City,
  Direction,
  Level,
  SpecialistWorkFormat,
} from '@/shared/model/enums';
import { FilterSecondaryButton } from '@/shared/ui/buttons/FilterSecondaryButton';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { ChipSelector } from '@/shared/ui/selectors/ChipSelector';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import type { SpecialistFilters } from '../model';

const ALL = 'All';

type DirectionFilter = Direction | typeof ALL;
type LevelFilter = Level | typeof ALL;
type CityFilter = City | typeof ALL;
type FormatFilter = SpecialistWorkFormat | typeof ALL;

interface SpecialistFiltersPanelProps {
  filters: SpecialistFilters;
  isLoading: boolean;
  onApply: (filters: SpecialistFilters) => void;
}

export function SpecialistFiltersPanel({
  filters,
  isLoading,
  onApply,
}: SpecialistFiltersPanelProps) {
  const { t } = useTranslation('employer');
  const colorScheme = useColorScheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [direction, setDirection] = useState<DirectionFilter>(
    filters.direction ?? ALL
  );
  const [level, setLevel] = useState<LevelFilter>(filters.level ?? ALL);
  const [city, setCity] = useState<CityFilter>(filters.city ?? ALL);
  const [format, setFormat] = useState<FormatFilter>(filters.format ?? ALL);

  const activeCount =
    (direction !== ALL ? 1 : 0) +
    (level !== ALL ? 1 : 0) +
    (city !== ALL ? 1 : 0) +
    (format !== ALL ? 1 : 0);

  const apply = () => {
    onApply({
      direction: direction === ALL ? undefined : direction,
      level: level === ALL ? undefined : level,
      city: city === ALL ? undefined : city,
      format: format === ALL ? undefined : format,
    });
  };

  const reset = () => {
    setDirection(ALL);
    setLevel(ALL);
    setCity(ALL);
    setFormat(ALL);
    onApply({});
  };

  return (
    <View className="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <Pressable
        onPress={() => setIsExpanded((prev) => !prev)}
        className="flex-row items-center justify-between"
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={t('specialists.filters')}
      >
        <View className="flex-row items-center">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('specialists.filters')}
          </Text>
          {activeCount > 0 ? (
            <Text className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              {activeCount}
            </Text>
          ) : null}
        </View>
        <MaterialIcons
          name={isExpanded ? 'arrow-drop-up' : 'arrow-drop-down'}
          size={30}
          color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
        />
      </Pressable>

      {isExpanded ? (
        <View className="mt-4">
          <ChipSelector
            label={t('specialists.direction')}
            options={[ALL, ...DIRECTION_VALUES]}
            selectedValue={direction}
            onSelect={setDirection}
            translationKey="directions"
            namespace="profile"
          />
          <ChipSelector
            label={t('specialists.level')}
            options={[ALL, ...LEVEL_VALUES]}
            selectedValue={level}
            onSelect={setLevel}
            translationKey="levels"
            namespace="profile"
          />
          <ChipSelector
            label={t('specialists.city')}
            options={[ALL, ...CITY_VALUES]}
            selectedValue={city}
            onSelect={setCity}
            translationKey="cities"
            namespace="profile"
          />
          <ChipSelector
            label={t('specialists.format')}
            options={[ALL, ...SPECIALIST_WORK_FORMAT_VALUES]}
            selectedValue={format}
            onSelect={setFormat}
            translationKey="specialists.formats"
            namespace="employer"
          />
          <View className="mt-2 flex-row gap-3">
            <View className="flex-1">
              <FilterSecondaryButton
                label={t('specialists.reset')}
                onPress={reset}
              />
            </View>
            <View className="flex-1">
              <PrimaryButton
                onPress={apply}
                isLoading={isLoading}
                className="mb-0"
              >
                {t('specialists.apply')}
              </PrimaryButton>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
