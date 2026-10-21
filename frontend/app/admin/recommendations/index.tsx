import { AdminHeader } from '@/features/admin/ui/AdminHeader';
import { useCareerStore } from '@/features/career/store';
import { ScenariosFilters, ScenarioItem } from '@/features/career/ui';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, FlatList, Platform, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminRecommendationsScreen() {
  const {
    scenarios,
    isLoadingScenarios,
    error,
    filters,
    setFilters,
    resetFilters,
    fetchScenarios,
    deleteScenario,
  } = useCareerStore();
  const { t } = useTranslation('career');
  const { t: tCommon } = useTranslation('common');
  const { colorScheme } = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  const backgroundColor = colorScheme === 'dark' ? '#111827' : '#f9fafb';

  function handleOpenScenario(id: string) {
    router.push(`/admin/recommendations/${id}`);
  }

  function handleApplyFilters() {
    fetchScenarios();
  }

  function handleResetFilters() {
    resetFilters();
    fetchScenarios();
  }

  function handleEdit(id: string) {
    router.push(`/admin/recommendations/${id}/edit`);
  }

  async function performDelete(id: string) {
    try {
      await deleteScenario(id);
    } catch {
      // error already shown in store
    }
  }

  function handleDelete(id: string) {
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          `${t('scenarios.delete')}: ${t('scenarios.deleteConfirm')}?`
        )
      ) {
        performDelete(id);
      }
      return;
    }
    Alert.alert(t('scenarios.delete'), t('scenarios.deleteConfirm'), [
      { text: t('form.cancel'), style: 'cancel' },
      {
        text: t('scenarios.delete'),
        style: 'destructive',
        onPress: () => performDelete(id),
      },
    ]);
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor }}
      edges={['top', 'bottom']}
    >
      <AdminHeader title={tCommon('adminRecommendationsTitle')} />
      <View className="flex-1 px-4 pb-4 pt-4">
        <Text className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {tCommon('adminRecommendationsDescription')}
        </Text>
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t('scenarios.listTitle')}
          </Text>
          <PrimaryButton
            onPress={() => router.push('/admin/recommendations/create')}
            accessibilityLabel={t('createButton')}
            className="px-4 py-2"
          >
            {t('createButton')}
          </PrimaryButton>
        </View>

        <ScenariosFilters
          filters={filters}
          isLoading={isLoadingScenarios}
          onChange={setFilters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />

        {error && (
          <View className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/40">
            <Text className="text-sm text-red-700 dark:text-red-300">
              {error}
            </Text>
          </View>
        )}

        <View className="flex-1">
          <FlatList
            data={scenarios || []}
            keyExtractor={(item) => item._id}
            refreshing={isLoadingScenarios}
            onRefresh={fetchScenarios}
            ListEmptyComponent={
              !isLoadingScenarios ? (
                <View className="mt-10 items-center">
                  <Text className="text-gray-500 dark:text-gray-400">
                    {t('scenarios.empty')}
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <ScenarioItem
                handleOpenScenario={handleOpenScenario}
                item={item}
                t={t}
                isAdmin
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          />
        </View>

        {scenarios && scenarios.length > 0 && (
          <View className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
            <Text className="text-center text-xs text-gray-500 dark:text-gray-400">
              {t('scenarios.total', { count: scenarios.length })}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
