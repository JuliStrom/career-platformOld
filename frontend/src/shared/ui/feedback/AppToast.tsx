import { useToastStore } from '@/shared/lib/toast';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type Href, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function AppToast() {
  const visible = useToastStore((state) => state.visible);
  const message = useToastStore((state) => state.message);
  const actionLabel = useToastStore((state) => state.actionLabel);
  const actionHref = useToastStore((state) => state.actionHref);
  const hide = useToastStore((state) => state.hide);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!visible || !message) {
    return null;
  }

  function handleAction() {
    if (!actionHref) return;
    hide();
    router.push(actionHref as Href);
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: 16,
        width: '50%',
        maxWidth: 320,
        bottom: Math.max(insets.bottom, 12) + 64,
        zIndex: 9999,
      }}
    >
      <View
        className="flex-row items-start overflow-hidden rounded-md bg-emerald-100 shadow-md dark:bg-emerald-950"
        style={{ borderLeftWidth: 6, borderLeftColor: '#16a34a' }}
      >
        <View className="px-3 pt-3">
          <MaterialIcons name="check-circle" size={22} color="#16a34a" />
        </View>
        <View className="flex-1 py-3 pr-4">
          <Text className="text-base font-bold text-gray-900 dark:text-emerald-50">
            {message}
          </Text>
          {actionLabel && actionHref ? (
            <Pressable
              onPress={handleAction}
              accessibilityRole="link"
              accessibilityLabel={actionLabel}
              className="mt-1 self-start active:opacity-70"
            >
              <Text className="text-sm font-medium text-emerald-800 underline dark:text-emerald-300">
                {actionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
