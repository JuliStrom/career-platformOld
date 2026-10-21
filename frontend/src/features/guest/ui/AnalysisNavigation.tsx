import { useAuthStore } from '@/features/auth/store/auth.store';
import { useAccountTabs } from '@/features/auth/lib/useAccountTabs';
import { UserType } from '@/shared/model';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Entry to the existing account tabs from the full resume analysis. */
export function AnalysisNavigation() {
  const userType = useAuthStore((state) => state.user?.userType);
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const color = colorScheme === 'dark' ? '#cbd5e1' : '#475569';
  const items = useAccountTabs(userType === UserType.EMPLOYER).filter(
    (tab) => tab.href
  );

  return (
    <View
      className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-800"
      style={{ paddingBottom: insets.bottom }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
      >
        {items.map((item) => (
          <Pressable
            key={String(item.href)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => router.push(item.href!)}
            className="min-h-16 flex-1 items-center justify-center gap-1 px-3 py-2 active:bg-blue-50 dark:active:bg-slate-700"
            style={{ minWidth: 92 }}
          >
            <MaterialIcons
              name={item.previewIcon ?? item.icon}
              size={24}
              color={color}
            />
            <Text
              numberOfLines={1}
              className="text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
