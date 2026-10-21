import { CareerScenarioAction } from '../model';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as WebBrowser from 'expo-web-browser';

interface RecommendationActionItemProps {
  action: CareerScenarioAction;
}

function getActionIcon(type: string): keyof typeof MaterialIcons.glyphMap {
  switch (type) {
    case 'lecture':
      return 'school';
    case 'consultation':
      return 'person';
    case 'article':
      return 'article';
    case 'community':
      return 'groups';
    default:
      return 'info';
  }
}

export function RecommendationActionItem({
  action,
}: RecommendationActionItemProps) {
  const { t } = useTranslation('career');
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#6B7280' : '#9CA3AF';

  const handlePress = async () => {
    if (action.link) {
      try {
        await WebBrowser.openBrowserAsync(action.link);
      } catch (error) {
        console.error('Error opening link:', error);
      }
    }
  };

  const iconName = getActionIcon(action.type);
  const actionTypeLabel = t(`actionTypes.${action.type}`);

  return (
    <Pressable
      onPress={action.link ? handlePress : undefined}
      disabled={!action.link}
      className={`mb-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800 ${
        action.link
          ? 'opacity-100 hover:bg-gray-100 active:opacity-85 dark:hover:bg-gray-700/80'
          : 'opacity-75'
      }`}
      accessibilityLabel={`${actionTypeLabel}: ${action.title}`}
      accessibilityHint={
        action.link ? t('recommendations.actions.openLink') : undefined
      }
    >
      <View className="flex-row items-start gap-3">
        <MaterialIcons name={iconName} size={24} color={iconColor} />
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {actionTypeLabel}
            </Text>
            {action.link && (
              <MaterialIcons name="open-in-new" size={16} color={iconColor} />
            )}
          </View>
          <Text className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {action.title}
          </Text>
          <Text className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {action.description}
          </Text>
          {!action.link && (
            <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {t('recommendations.actions.noLink')}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
