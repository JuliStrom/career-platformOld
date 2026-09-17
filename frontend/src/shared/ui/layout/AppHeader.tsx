import { useAuthStore } from '@/features/auth/store/auth.store';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  useColorScheme,
  View,
} from 'react-native';

const logoLight = require('../../../../assets/images/logo.png');
const logoDark = require('../../../../assets/images/logo-dark.png');

export function AppHeader() {
  const colorScheme = useColorScheme();
  const { t: tAuth } = useTranslation('auth');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    if (isLoading) return;
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <View className="w-full flex-row flex-wrap items-center justify-between gap-3 border-b border-hairline bg-header px-4 py-3 dark:border-hairline-dark dark:bg-header-dark">
      <Image
        source={colorScheme === 'dark' ? logoDark : logoLight}
        resizeMode="contain"
        style={{ width: 180, height: 54 }}
        accessibilityLabel="Career Platform"
      />
      <View className="flex-row flex-wrap items-center gap-3">
        <LanguageSwitcher />
        {isAuthenticated ? (
          <Pressable
            onPress={handleLogout}
            disabled={isLoading}
            className="justify-center rounded-lg border border-gray-300 bg-black/10 px-3 py-2 dark:border-gray-600 dark:bg-black/30"
            accessibilityRole="button"
            accessibilityLabel={tAuth('logout.button')}
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
            style={({ pressed }) =>
              pressed && !isLoading ? { opacity: 0.85 } : undefined
            }
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#4b5563" />
            ) : (
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {tAuth('logout.button')}
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
