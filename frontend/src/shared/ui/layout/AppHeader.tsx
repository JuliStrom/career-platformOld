import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorScheme } from 'nativewind';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { BrandLogo } from './BrandLogo';

export function AppHeader({
  transparent = false,
  action,
}: {
  transparent?: boolean;
  action?: ReactNode;
}) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const { t } = useTranslation('common');
  const { t: tAuth } = useTranslation('auth');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);
  const isDark = colorScheme === 'dark';
  const darkHeader = transparent || isDark;
  const handleLogout = async () => {
    if (isLoading) return;
    await logout();
    router.replace('/');
  };
  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setColorScheme(next);
    try {
      globalThis.localStorage?.setItem('career-theme', next);
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
  };
  return (
    <View
      className={`w-full flex-row flex-wrap items-center justify-between gap-3 border-b px-4 py-3 ${transparent ? 'border-white/20 bg-transparent' : 'border-hairline bg-header dark:border-hairline-dark dark:bg-header-dark'}`}
    >
      <BrandLogo dark={darkHeader} />
      <View className="ml-auto max-w-full flex-row flex-wrap items-center justify-end gap-3">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel={t(isDark ? 'theme.light' : 'theme.dark')}
            className={`min-h-11 min-w-11 items-center justify-center rounded-lg ${darkHeader ? 'active:bg-white/10' : 'active:bg-slate-200'}`}
          >
            <MaterialIcons
              name={isDark ? 'light-mode' : 'dark-mode'}
              size={22}
              color={darkHeader ? '#cbd5e1' : '#334155'}
            />
          </Pressable>
          <LanguageSwitcher light={transparent} />
        </View>
        {(isAuthenticated || action) && (
          <View
            className={`ml-4 border-l pl-4 sm:ml-6 sm:pl-6 ${darkHeader ? 'border-white/20' : 'border-slate-400/50'}`}
          >
            {isAuthenticated ? (
              <Pressable
                onPress={handleLogout}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel={tAuth('logout.button')}
                accessibilityState={{ disabled: isLoading, busy: isLoading }}
                className={`min-h-11 flex-row items-center justify-center gap-2 rounded-xl border px-4 py-2 ${darkHeader ? 'border-slate-400/40 active:bg-white/10' : 'border-slate-400/50 active:bg-slate-200'}`}
              >
                {isLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={darkHeader ? '#cbd5e1' : '#334155'}
                  />
                ) : (
                  <MaterialIcons
                    name="logout"
                    size={20}
                    color={darkHeader ? '#cbd5e1' : '#334155'}
                  />
                )}
                <Text
                  style={{ color: darkHeader ? '#cbd5e1' : '#334155' }}
                  className="text-sm font-semibold"
                >
                  {tAuth('logout.button')}
                </Text>
              </Pressable>
            ) : (
              action
            )}
          </View>
        )}
      </View>
    </View>
  );
}
