import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type Href, usePathname, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

interface AdminHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

/** Хедер админ-панели: кнопка «Назад», заголовок, «Меню», «Выйти». */
export function AdminHeader({
  title,
  showBack = true,
  onBack,
}: AdminHeaderProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const pathname = usePathname();
  const { colorScheme } = useColorScheme();
  const isAdminHome = pathname === '/admin' || pathname === '/admin/';

  const showBackButton = showBack && !isAdminHome;
  const iconColor = colorScheme === 'dark' ? '#60a5fa' : '#2563eb';

  return (
    <View className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        {showBackButton && (
          <Pressable
            onPress={() => {
              if (onBack) {
                onBack();
                return;
              }
              const path = pathname ?? '';
              if (
                path.startsWith('/admin/') &&
                path !== '/admin' &&
                path !== '/admin/'
              ) {
                const segments = path
                  .replace(/^\/admin\/?/, '')
                  .split('/')
                  .filter(Boolean);
                if (segments.length > 1) {
                  router.replace(
                    `/admin/${segments.slice(0, -1).join('/')}` as Href
                  );
                } else {
                  router.replace('/admin' as Href);
                }
              } else {
                router.back();
              }
            }}
            className="mr-2 flex-row items-center gap-1 rounded-lg p-2 active:bg-gray-100 dark:active:bg-gray-700"
            accessibilityLabel={t('back')}
            accessibilityRole="button"
          >
            <MaterialIcons name="arrow-back" size={20} color={iconColor} />
            <Text className="text-base font-medium text-blue-600 dark:text-blue-400">
              {t('back')}
            </Text>
          </Pressable>
        )}
        <Text
          className="flex-1 text-lg font-semibold text-gray-900 dark:text-white"
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        {isAdminHome ? (
          <Pressable
            onPress={() => router.replace('/profile')}
            className="rounded-lg px-3 py-2 active:bg-gray-100 dark:active:bg-gray-700"
            accessibilityLabel={t('adminExit')}
            accessibilityRole="button"
          >
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('adminExit')}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.replace('/admin')}
            className="rounded-lg px-3 py-2 active:bg-gray-100 dark:active:bg-gray-700"
            accessibilityLabel={t('adminMenu')}
            accessibilityRole="button"
          >
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('adminMenu')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
