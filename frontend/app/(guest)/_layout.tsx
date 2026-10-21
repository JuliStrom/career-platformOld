import { surfaceColor } from '@/shared/config/theme/colors';
import { Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';

export default function GuestLayout() {
  const { colorScheme } = useColorScheme();
  const backgroundColor = surfaceColor('canvas', colorScheme);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor,
        },
      }}
    >
      <Stack.Screen name="upload" options={{ title: 'Upload resume' }} />
      <Stack.Screen name="no-resume" options={{ title: 'No resume' }} />
      <Stack.Screen name="analysis" options={{ title: 'Analysis' }} />
      <Stack.Screen name="result" options={{ title: 'Resume preview' }} />
    </Stack>
  );
}
