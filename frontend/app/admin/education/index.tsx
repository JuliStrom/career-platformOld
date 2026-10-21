import {
  deleteEducation,
  fetchEducations,
  type EducationsFilters,
  type EducationResource,
} from '@/features/education/api/education.api';
import { AdminHeader } from '@/features/admin/ui/AdminHeader';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { Direction } from '@/shared/model';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { FilterSecondaryButton } from '@/shared/ui/buttons/FilterSecondaryButton';
import { ChipSelector } from '@/shared/ui/selectors/ChipSelector';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

const DIRECTION_OPTIONS = ['All', ...Object.values(Direction)] as const;
const LEVEL_OPTIONS = [
  'All',
  'Beginner',
  'Middle',
  'Advanced',
  '\u041b\u044e\u0431\u043e\u0439',
] as const;
const TYPE_OPTIONS = ['All', 'course', 'internship', 'grant', 'event'] as const;
const FORMAT_OPTIONS = ['All', 'online', 'offline', 'hybrid'] as const;
const LOCATION_OPTIONS = ['All', 'kz', 'abroad', 'online'] as const;
const PRICE_OPTIONS = ['All', 'free', 'paid'] as const;

export default function AdminEducationListScreen() {
  const { t } = useTranslation('common');
  const { t: tCareer } = useTranslation('career');
  const router = useRouter();

  const [educations, setEducations] = useState<EducationResource[]>([]);
  const [filters, setFilters] = useState<EducationsFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextFilters: EducationsFilters = filters) => {
      setError(null);
      setLoading(true);
      try {
        const data = await fetchEducations(nextFilters);
        setEducations(data);
      } catch {
        setError(t('errors.networkError'));
      } finally {
        setLoading(false);
      }
    },
    [filters, t]
  );

  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [load]);

  function translateDirection(direction: string) {
    const translated = tCareer(`directions.${direction}`);
    return translated === `directions.${direction}` ? direction : translated;
  }

  function getEducationId(education: EducationResource) {
    return education._id || education.id || '';
  }

  function handleEdit(education: EducationResource) {
    const id = getEducationId(education);
    if (!id) return;
    router.push(`/admin/education/${id}/edit` as never);
  }

  async function performDelete(education: EducationResource) {
    const id = getEducationId(education);
    if (!id) return;

    try {
      await deleteEducation(id);
      setEducations((prev) =>
        prev.filter((item) => getEducationId(item) !== id)
      );
    } catch {
      setError(t('errors.networkError'));
    }
  }

  function handleDelete(education: EducationResource) {
    if (Platform.OS === 'web') {
      if (window.confirm(`${t('educations.delete')}: ${education.title}?`)) {
        performDelete(education);
      }
      return;
    }

    Alert.alert(t('educations.delete'), education.title, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('educations.delete'),
        style: 'destructive',
        onPress: () => performDelete(education),
      },
    ]);
  }

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      edges={['top', 'bottom']}
    >
      <AdminHeader title={t('adminEducationsTitle')} />
      <View className="flex-1 px-4 pb-4 pt-4">
        <FlatList
          style={{ flex: 1 }}
          data={educations}
          keyExtractor={(item) => item._id || item.id || item.title}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} />
          }
          ListHeaderComponent={
            <>
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('educations.listTitle')}
                </Text>
                <PrimaryButton
                  onPress={() => router.push('/admin/education/create')}
                  className="mb-0 px-4 py-2"
                >
                  {t('educations.create')}
                </PrimaryButton>
              </View>

              {error && (
                <View className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/40">
                  <Text className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </Text>
                </View>
              )}

              <EducationsFiltersPanel
                filters={filters}
                isLoading={loading}
                onApply={(nextFilters) => {
                  setFilters(nextFilters);
                  load(nextFilters);
                }}
                onReset={() => {
                  setFilters({});
                  load({});
                }}
                t={t}
              />
            </>
          }
          ListEmptyComponent={
            !loading ? (
              <View className="mt-10 items-center">
                <Text className="text-gray-500 dark:text-gray-400">
                  {t('educations.empty')}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <EducationCard
              education={item}
              t={t}
              translateDirection={translateDirection}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        />
      </View>
    </SafeAreaView>
  );
}

function EducationsFiltersPanel({
  filters,
  isLoading,
  onApply,
  onReset,
  t,
}: {
  filters: EducationsFilters;
  isLoading: boolean;
  onApply: (filters: EducationsFilters) => void;
  onReset: () => void;
  t: (key: string) => string;
}) {
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
    <View className="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
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
              options={DIRECTION_OPTIONS}
              selectedValue={
                (draft.direction ?? 'All') as (typeof DIRECTION_OPTIONS)[number]
              }
              onSelect={(value) => setDraftValue('direction', value)}
              translationKey="directions"
              namespace="career"
            />
            <ChipSelector
              label={t('educations.filters.type')}
              options={TYPE_OPTIONS}
              selectedValue={
                (draft.type ?? 'All') as (typeof TYPE_OPTIONS)[number]
              }
              onSelect={(value) => setDraftValue('type', value)}
              translationKey="educations.filterTypes"
              namespace="common"
            />
            <ChipSelector
              label={t('educations.filters.format')}
              options={FORMAT_OPTIONS}
              selectedValue={
                (draft.locationType ?? 'All') as (typeof FORMAT_OPTIONS)[number]
              }
              onSelect={(value) => setDraftValue('locationType', value)}
              translationKey="educations.filterFormats"
              namespace="common"
            />
            <ChipSelector
              label={t('educations.filters.location')}
              options={LOCATION_OPTIONS}
              selectedValue={
                (draft.location ?? 'All') as (typeof LOCATION_OPTIONS)[number]
              }
              onSelect={(value) => setDraftValue('location', value)}
              translationKey="educations.filterLocations"
              namespace="common"
            />
            <ChipSelector
              label={t('educations.filters.price')}
              options={PRICE_OPTIONS}
              selectedValue={
                (draft.price ?? 'All') as (typeof PRICE_OPTIONS)[number]
              }
              onSelect={(value) => setDraftValue('price', value)}
              translationKey="educations.filterPrices"
              namespace="common"
            />
            <ChipSelector
              label={t('educations.filters.level')}
              options={LEVEL_OPTIONS}
              selectedValue={
                (draft.level ?? 'All') as (typeof LEVEL_OPTIONS)[number]
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

function EducationCard({
  education,
  t,
  translateDirection,
  onEdit,
  onDelete,
}: {
  education: EducationResource;
  t: (key: string) => string;
  translateDirection: (direction: string) => string;
  onEdit: (education: EducationResource) => void;
  onDelete: (education: EducationResource) => void;
}) {
  const emptyValue = t('educations.emptyValue');
  const price =
    education.price === 0
      ? t('educations.free')
      : education.price == null
        ? emptyValue
        : formatKztPrice(education.price);
  const skillsTags =
    education.skillsTags == null
      ? emptyValue
      : JSON.stringify(education.skillsTags);

  return (
    <View className="mb-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <View className="mb-3 rounded-lg border-l-4 border-blue-500 bg-blue-50 px-3 py-2.5 dark:bg-blue-950/40">
        <Text className="text-lg font-bold leading-6 text-blue-950 dark:text-blue-100">
          {education.title}
        </Text>
      </View>
      <EducationField
        label={t('educations.provider')}
        value={education.provider || emptyValue}
      />
      <EducationField
        label={t('educations.type')}
        value={education.type || emptyValue}
      />
      <EducationField
        label={t('educations.direction')}
        value={
          education.direction
            ? translateDirection(education.direction)
            : emptyValue
        }
      />
      <EducationField
        label={t('educations.level')}
        value={education.level || emptyValue}
      />
      <EducationField
        label={t('educations.city')}
        value={education.city || emptyValue}
      />
      <EducationField
        label={t('educations.country')}
        value={education.country || emptyValue}
      />
      <EducationField
        label={t('educations.url')}
        value={education.url || emptyValue}
      />
      <EducationField label={t('educations.skillsTags')} value={skillsTags} />
      <EducationField
        label={t('educations.durationWeeks')}
        value={
          education.durationWeeks == null
            ? emptyValue
            : String(education.durationWeeks)
        }
      />
      <EducationField label={t('educations.price')} value={price} />
      <EducationField
        label={t('educations.locationType')}
        value={education.locationType || emptyValue}
      />
      <EducationField
        label={t('educations.isFeatured')}
        value={formatBoolean(education.isFeatured, t)}
      />
      <EducationField
        label={t('educations.isReskilling')}
        value={formatBoolean(education.isReskilling, t)}
      />
      <EducationField
        label={t('educations.isInternational')}
        value={formatBoolean(education.isInternational, t)}
      />
      <View className="mt-3 flex-row justify-end gap-2">
        <Pressable
          onPress={() => onEdit(education)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 dark:bg-blue-500"
          hitSlop={8}
          accessibilityLabel={t('educations.edit')}
        >
          <Text className="text-xs font-semibold text-white">
            {t('educations.edit')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onDelete(education)}
          className="rounded-lg bg-red-600 px-3 py-1.5 dark:bg-red-500"
          hitSlop={8}
          accessibilityLabel={t('educations.delete')}
        >
          <Text className="text-xs font-semibold text-white">
            {t('educations.delete')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function EducationField({ label, value }: { label: string; value: string }) {
  return (
    <View className="mt-1.5 flex-row flex-wrap">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}:{' '}
      </Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400">{value}</Text>
    </View>
  );
}

function formatBoolean(value: boolean | undefined, t: (key: string) => string) {
  if (value === undefined) return t('educations.emptyValue');
  return value ? t('educations.yes') : t('educations.no');
}

function formatKztPrice(price: number) {
  return `${price.toLocaleString('ru-RU')} ₸`;
}
