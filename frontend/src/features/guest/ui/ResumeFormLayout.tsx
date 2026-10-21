import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { AppHeader } from '@/shared/ui';
import { NamedField } from '@/shared/ui/inputs/NamedField';
import { Checkbox } from '@/shared/ui/checkbox/Checkbox';
import { router } from 'expo-router';
import { useGuestSessionStore } from '../store/guest-session.store';
import type { ComponentProps, ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ResumeConsent({
  value,
  onChange,
  from,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  from: '/upload' | '/no-resume';
}) {
  const { t } = useTranslation('guest');
  const days = useGuestSessionStore(
    (state) => state.session?.retentionDays ?? 30
  );
  return (
    <View className="mb-6 flex-row items-start border-t border-slate-100 pt-6 dark:border-slate-700">
      <Checkbox value={value} onChange={onChange} />
      <Text className="ml-3 flex-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
        {t('upload.consent.text', { days })}{' '}
        <Text
          className="text-blue-600 dark:text-blue-400"
          onPress={() =>
            router.push({ pathname: '/privacy-policy', params: { from } })
          }
        >
          {t('upload.consent.link')}
        </Text>
      </Text>
    </View>
  );
}

export function ResumeField(props: ComponentProps<typeof NamedField>) {
  return (
    <NamedField
      margin="mb-6"
      labelClassName="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
      inputClassName={`min-h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white ${props.multiline ? 'min-h-[100px]' : ''}`}
      placeholderTextColor="#94a3b8"
      textAlignVertical="top"
      {...props}
    />
  );
}

export function ResumeFormLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useTranslation('guest');
  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-[#1e293b]"
      edges={['top']}
    >
      <AppHeader />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingTop: 40,
          paddingBottom: 64,
        }}
      >
        <View className="w-full max-w-[640px] self-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-12">
          <Text className="mb-5 text-xs font-bold uppercase tracking-[2px] text-blue-600 dark:text-blue-400">
            {t('upload.eyebrow')}
          </Text>
          <Text className="mb-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </Text>
          <Text className="mb-9 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {subtitle}
          </Text>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
