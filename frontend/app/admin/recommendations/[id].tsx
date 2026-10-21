import { AdminHeader } from '@/features/admin/ui/AdminHeader';
import { getScenarioAuthorEmail } from '@/features/career/lib/scenarioAuthor';
import { useCareerStore } from '@/features/career/store';
import { RecommendationActionItem } from '@/features/career/ui';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { PrimaryButton } from '@/shared/ui/buttons/PrimaryButton';
import { FullScreenLoader } from '@/src/shared/ui/common/FullScreenLoader';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminRecommendationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
    selectedScenario,
    isLoadingScenarios,
    isDeleting,
    error,
    fetchScenarioById,
    resetSelectedScenario,
    deleteScenario,
  } = useCareerStore();
  const { t } = useTranslation('career');
  const { t: tCommon } = useTranslation('common');
  const { colorScheme } = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      fetchScenarioById(id);
    }

    return () => {
      resetSelectedScenario();
    };
  }, [id, fetchScenarioById, resetSelectedScenario]);

  const backgroundColor = colorScheme === 'dark' ? '#111827' : '#f9fafb';

  async function performDelete() {
    if (!id) return;
    try {
      await deleteScenario(id);
      router.replace('/admin/recommendations');
    } catch {
      // error already shown in store
    }
  }

  function handleDelete() {
    if (!id) return;
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          `${t('scenarios.delete')}: ${t('scenarios.deleteConfirm')}?`
        )
      ) {
        performDelete();
      }
      return;
    }
    Alert.alert(t('scenarios.delete'), t('scenarios.deleteConfirm'), [
      { text: t('form.cancel'), style: 'cancel' },
      {
        text: t('scenarios.delete'),
        style: 'destructive',
        onPress: () => performDelete(),
      },
    ]);
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!id) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor }}
      >
        <Text className="text-gray-500 dark:text-gray-400">
          {t('scenarios.notFound')}
        </Text>
      </SafeAreaView>
    );
  }

  if (isLoadingScenarios) {
    return <FullScreenLoader />;
  }

  if (!selectedScenario) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor }}
      >
        <Text className="mb-4 text-gray-500 dark:text-gray-400">
          {error || t('scenarios.notFound')}
        </Text>
        <PrimaryButton onPress={() => router.back()}>
          {t('scenarios.back')}
        </PrimaryButton>
      </SafeAreaView>
    );
  }

  const directionText =
    t(`directions.${selectedScenario.direction}`) || selectedScenario.direction;
  const levelText =
    t(`levels.${selectedScenario.level}`) || selectedScenario.level;
  const translationBaseKey = selectedScenario.translationKey
    ? `recommendations.content.${selectedScenario.translationKey}`
    : null;
  const title = translationBaseKey
    ? t(`${translationBaseKey}.title`)
    : selectedScenario.title;
  const description = translationBaseKey
    ? t(`${translationBaseKey}.description`)
    : selectedScenario.description;

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor }}
      edges={['top', 'bottom']}
    >
      <AdminHeader title={tCommon('adminRecommendationsTitle')} />
      <ScrollView
        className="flex-1 px-4 pb-6 pt-4"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="mb-4 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-blue-100 px-3 py-1.5 dark:bg-blue-900">
            <Text className="text-xs font-semibold text-blue-800 dark:text-blue-200">
              {directionText}
            </Text>
          </View>
          <View className="rounded-full bg-purple-100 px-3 py-1.5 dark:bg-purple-900">
            <Text className="text-xs font-semibold text-purple-800 dark:text-purple-200">
              {levelText}
            </Text>
          </View>
          <View
            className={`rounded-full px-3 py-1.5 ${
              selectedScenario.isActive
                ? 'bg-green-100 dark:bg-green-900'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                selectedScenario.isActive
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {selectedScenario.isActive
                ? t('scenarios.status.active')
                : t('scenarios.status.inactive')}
            </Text>
          </View>
        </View>

        <Text className="text-2xl font-semibold text-gray-900 dark:text-white">
          {title}
        </Text>

        <View className="mt-6">
          <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
            {t('scenarios.details.description')}
          </Text>
          <Text className="text-sm leading-5 text-gray-700 dark:text-gray-300">
            {selectedScenario.description}
          </Text>
        </View>

        {selectedScenario.actions.length > 0 && (
          <View className="mt-6">
            <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
              {t('form.actions')}
            </Text>
            {selectedScenario.actions.map((action, index) => {
              const localizedAction = translationBaseKey
                ? {
                    ...action,
                    title: t(`${translationBaseKey}.actions.${index}.title`),
                    description: t(
                      `${translationBaseKey}.actions.${index}.description`
                    ),
                  }
                : action;
              return (
                <View
                  key={index}
                  className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <RecommendationActionItem action={localizedAction} />
                </View>
              );
            })}
          </View>
        )}

        <View className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <Text className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
            {t('scenarios.details.metadata')}
          </Text>
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            {t('scenarios.createdBy')}:{' '}
            {getScenarioAuthorEmail(selectedScenario)}
          </Text>
          <Text className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {t('scenarios.createdAt')}: {formatDate(selectedScenario.createdAt)}
          </Text>
          <Text className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {t('scenarios.updatedAt')}: {formatDate(selectedScenario.updatedAt)}
          </Text>
        </View>

        {error && (
          <View className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/40">
            <Text className="text-sm text-red-700 dark:text-red-300">
              {error}
            </Text>
          </View>
        )}

        <View className="mt-8 gap-3">
          <PrimaryButton
            onPress={() => router.push(`/admin/recommendations/${id}/edit`)}
            accessibilityLabel={t('scenarios.edit')}
            className="mb-0"
          >
            {t('scenarios.edit')}
          </PrimaryButton>
          <PrimaryButton
            onPress={handleDelete}
            disabled={isDeleting}
            isLoading={isDeleting}
            className="mb-0 bg-red-600 dark:bg-red-600"
            accessibilityLabel={t('scenarios.delete')}
          >
            {t('scenarios.delete')}
          </PrimaryButton>
          <PrimaryButton
            onPress={() => router.replace('/admin/recommendations')}
          >
            {t('scenarios.back')}
          </PrimaryButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
