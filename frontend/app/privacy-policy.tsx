import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function PrivacyPolicy() {
  const { from } = useLocalSearchParams();
  const { t } = useTranslation('privacy');

  return (
    <View className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="mt-4 flex-row items-center justify-between border-b border-gray-300 px-4 py-3 dark:border-gray-700">
        <TouchableOpacity
          onPress={() =>
            from ? router.push({ pathname: from as any }) : router.back()
          }
        >
          <Text className="text-base text-blue-600 dark:text-blue-400">
            {t('back')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Text className="text-base text-blue-600 dark:text-blue-400">
            {t('home')}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView className="px-6 py-6">
        <Text className="mb-4 text-center text-2xl font-bold text-slate-900 dark:text-white">
          {t('title')}
        </Text>
        <Text className="text-base leading-relaxed text-slate-700 dark:text-slate-300">
          {t('content')}
        </Text>
      </ScrollView>
    </View>
  );
}
