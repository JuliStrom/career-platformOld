import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { AppHeader } from '@/shared/ui';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGuestSessionStore } from '../store/guest-session.store';

const heroImage = require('../../../../assets/images/career-hero.jpg');
// Intrinsic dimensions of career-hero.jpg; available during web prerendering
// without calling the native-only Image.resolveAssetSource API.
const heroDimensions = { width: 1672, height: 941 };

export function GuestLandingScreen() {
  const { t } = useTranslation('guest');
  const { t: tAuth } = useTranslation('auth');
  const captureFromUrl = useGuestSessionStore((state) => state.captureFromUrl);
  const { width, height } = useWindowDimensions();
  const compact = width < 768;
  const [backgroundSize, setBackgroundSize] = useState({ width, height });
  const portrait = backgroundSize.height > backgroundSize.width;
  const backgroundScale = Math.max(
    backgroundSize.width / heroDimensions.width,
    backgroundSize.height / heroDimensions.height
  );
  const imageWidth = heroDimensions.width * backgroundScale;
  const imageHeight = heroDimensions.height * backgroundScale;
  // Keep the desk and window in view on portrait screens, and the full
  // composition centered on wider screens without stretching the photograph.
  const focalPoint = portrait ? 0.72 : width < 1024 ? 0.6 : 0.5;

  useEffect(() => {
    captureFromUrl();
  }, [captureFromUrl]);

  return (
    <View
      style={[styles.screen, { minHeight: height }]}
      onLayout={({ nativeEvent: { layout } }) => {
        setBackgroundSize((previous) =>
          previous.width === layout.width && previous.height === layout.height
            ? previous
            : { width: layout.width, height: layout.height }
        );
      }}
    >
      <Image
        source={heroImage}
        resizeMode="cover"
        style={{
          position: 'absolute',
          width: imageWidth,
          height: imageHeight,
          left: (backgroundSize.width - imageWidth) * focalPoint,
          top: (backgroundSize.height - imageHeight) * 0.5,
        }}
        accessible={false}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: portrait
              ? 'rgba(5, 17, 35, 0.68)'
              : compact
                ? 'rgba(5, 17, 35, 0.55)'
                : 'rgba(5, 17, 35, 0.35)',
          },
        ]}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <AppHeader
          transparent
          action={
            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/login')}
                className="min-h-11 items-center justify-center rounded-xl border border-white/30 px-3 py-2 active:bg-white/10"
              >
                <Text className="text-sm font-semibold text-white">
                  {tAuth('login.title')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/register')}
                className="min-h-11 items-center justify-center rounded-xl border border-blue-300/50 bg-blue-500/20 px-3 py-2 active:bg-blue-500/40"
              >
                <Text className="text-sm font-semibold text-white">
                  {tAuth('register.title')}
                </Text>
              </Pressable>
            </View>
          }
        />
        <View style={styles.hero}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View
              style={[
                styles.container,
                {
                  paddingHorizontal: compact ? 24 : 64,
                  paddingVertical: height < 600 ? 32 : compact ? 56 : 96,
                },
              ]}
            >
              <View style={[styles.copy, { maxWidth: compact ? 520 : 610 }]}>
                <View style={styles.eyebrowRow}>
                  <View style={styles.rule} />
                  <Text style={styles.eyebrow}>{t('hero.eyebrow')}</Text>
                </View>
                <Text style={[styles.brand, { fontSize: compact ? 30 : 42 }]}>
                  cntrbute
                </Text>
                <Text
                  accessibilityRole="header"
                  style={[
                    styles.title,
                    {
                      fontSize: compact ? 42 : 60,
                      lineHeight: compact ? 48 : 66,
                    },
                  ]}
                >
                  {t('hero.title')}
                </Text>
                <Text style={styles.subtitle}>{t('hero.subtitle')}</Text>
                <View
                  style={[
                    styles.actions,
                    {
                      flexDirection: compact ? 'column' : 'row',
                      alignItems: compact ? 'stretch' : 'center',
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => router.push('/upload')}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.uploadButton,
                      { opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <MaterialIcons name="file-upload" size={20} color="#fff" />
                    <Text style={styles.uploadLabel}>{t('hero.upload')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/no-resume')}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.secondaryLabel]}>{t('noResume')}</Text>
                    <MaterialIcons
                      name="arrow-forward"
                      size={18}
                      color="#a8c8ff"
                    />
                  </Pressable>
                </View>
                <Text style={styles.fileHint}>{t('upload.file.hint')}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#071426',
  },
  hero: { flex: 1, overflow: 'hidden' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  container: { width: '100%', maxWidth: 1440, alignSelf: 'center' },
  copy: { width: '100%' },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 26,
  },
  rule: { width: 28, height: 1, backgroundColor: '#81afff' },
  eyebrow: {
    flex: 1,
    color: '#abc9f5',
    fontSize: 10,
    lineHeight: 17,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  brand: {
    color: '#85b2ff',
    fontWeight: '700',
    marginBottom: 14,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 24,
  },
  subtitle: {
    maxWidth: 480,
    color: '#c0c9d8',
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 32,
  },
  actions: { gap: 24 },
  uploadButton: {
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#3478f6',
  },
  uploadLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  secondaryLabel: {
    color: '#d2dbea',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  fileHint: { color: '#94a3b8', fontSize: 11, lineHeight: 18, marginTop: 14 },
});
