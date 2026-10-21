import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher';
import { Image, Text, useColorScheme, View } from 'react-native';

const logoLight = require('../../../../assets/images/logo.png');
const logoDark = require('../../../../assets/images/logo-dark.png');

export function AppHeader() {
  const colorScheme = useColorScheme();
  return (
    <View className="w-full flex-row flex-wrap items-center justify-between gap-3 border-b border-hairline bg-header px-4 py-3 dark:border-hairline-dark dark:bg-header-dark">
      <View
        className="flex-row items-center gap-2"
        accessible
        accessibilityRole="image"
        accessibilityLabel="Career-platform"
      >
        {/* Show only the existing emblem; the wordmark is rendered as text. */}
        <View style={{ width: 38, height: 40, overflow: 'hidden' }}>
          <Image
            source={colorScheme === 'dark' ? logoDark : logoLight}
            resizeMode="stretch"
            style={{
              width: 210,
              height: 70,
              position: 'absolute',
              left: -11,
              top: -14,
            }}
            accessible={false}
          />
        </View>
        <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Career
          <Text className="text-blue-600 dark:text-blue-400">-platform</Text>
        </Text>
      </View>
      <LanguageSwitcher />
    </View>
  );
}
