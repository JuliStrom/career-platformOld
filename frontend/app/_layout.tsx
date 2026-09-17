import { setupAuthInterceptors } from '@/features/auth/api/auth.interceptor';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ErrorBoundary } from '@/src/shared/ui/common/ErrorBoundary';
import { AppToast } from '@/shared/ui/feedback/AppToast';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { applyClientLanguagePreference } from '../src/shared/config/i18n';
import './global.css';

export default function RootLayout() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    applyClientLanguagePreference();

    const ejectInterceptors = setupAuthInterceptors();

    initializeAuth();

    return () => {
      ejectInterceptors?.();
    };
  }, [initializeAuth]);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <Slot />
            <AppToast />
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
