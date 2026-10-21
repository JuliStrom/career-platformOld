import { surfaceColor } from '@/shared/config/theme/colors';
import { Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';

export default function OnboardingLayout() {
  const { colorScheme } = useColorScheme();
  const backgroundColor = surfaceColor('canvas', colorScheme);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor },
      }}
    />
  );
}
