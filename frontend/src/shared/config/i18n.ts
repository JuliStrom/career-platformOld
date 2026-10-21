import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';

import enAuth from './i18n/locales/en/auth.json';
import enCareer from './i18n/locales/en/career.json';
import enCommon from './i18n/locales/en/common.json';
import enEmployer from './i18n/locales/en/employer.json';
import enGuest from './i18n/locales/en/guest.json';
import enJobs from './i18n/locales/en/jobs.json';
import enNotifications from './i18n/locales/en/notifications.json';
import privacyEn from './i18n/locales/en/privacy.json';
import enProfile from './i18n/locales/en/profile.json';
import termsEn from './i18n/locales/en/terms.json';
import kzAuth from './i18n/locales/kz/auth.json';
import kzCareer from './i18n/locales/kz/career.json';
import kzCommon from './i18n/locales/kz/common.json';
import kzEmployer from './i18n/locales/kz/employer.json';
import kzGuest from './i18n/locales/kz/guest.json';
import kzJobs from './i18n/locales/kz/jobs.json';
import kzNotifications from './i18n/locales/kz/notifications.json';
import privacyKz from './i18n/locales/kz/privacy.json';
import kzProfile from './i18n/locales/kz/profile.json';
import termsKz from './i18n/locales/kz/terms.json';
import ruAuth from './i18n/locales/ru/auth.json';
import ruCareer from './i18n/locales/ru/career.json';
import ruCommon from './i18n/locales/ru/common.json';
import ruEmployer from './i18n/locales/ru/employer.json';
import ruGuest from './i18n/locales/ru/guest.json';
import ruJobs from './i18n/locales/ru/jobs.json';
import ruNotifications from './i18n/locales/ru/notifications.json';
import privacyRu from './i18n/locales/ru/privacy.json';
import ruProfile from './i18n/locales/ru/profile.json';
import termsRu from './i18n/locales/ru/terms.json';
import uzAuth from './i18n/locales/uz/auth.json';
import uzCareer from './i18n/locales/uz/career.json';
import uzCommon from './i18n/locales/uz/common.json';
import uzEmployer from './i18n/locales/uz/employer.json';
import uzGuest from './i18n/locales/uz/guest.json';
import uzJobs from './i18n/locales/uz/jobs.json';
import uzNotifications from './i18n/locales/uz/notifications.json';
import privacyUz from './i18n/locales/uz/privacy.json';
import uzProfile from './i18n/locales/uz/profile.json';
import termsUz from './i18n/locales/uz/terms.json';

const resources = {
  uz: {
    common: uzCommon,
    profile: uzProfile,
    auth: uzAuth,
    employer: uzEmployer,
    jobs: uzJobs,
    notifications: uzNotifications,
    career: uzCareer,
    privacy: privacyUz,
    terms: termsUz,
    guest: uzGuest,
  },
  kk: {
    common: kzCommon,
    profile: kzProfile,
    auth: kzAuth,
    employer: kzEmployer,
    jobs: kzJobs,
    notifications: kzNotifications,
    career: kzCareer,
    privacy: privacyKz,
    terms: termsKz,
    guest: kzGuest,
  },
  ru: {
    common: ruCommon,
    profile: ruProfile,
    auth: ruAuth,
    employer: ruEmployer,
    jobs: ruJobs,
    notifications: ruNotifications,
    career: ruCareer,
    privacy: privacyRu,
    terms: termsRu,
    guest: ruGuest,
  },
  en: {
    common: enCommon,
    profile: enProfile,
    auth: enAuth,
    employer: enEmployer,
    jobs: enJobs,
    notifications: enNotifications,
    career: enCareer,
    privacy: privacyEn,
    terms: termsEn,
    guest: enGuest,
  },
};

export const LANGUAGE_KEY = 'app_language';
export const SUPPORTED_LANGUAGES = ['ru', 'kk', 'uz', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function normalizeLanguage(value?: string | null): AppLanguage | undefined {
  const language = value?.toLowerCase().split(/[-_]/)[0];
  // KZ is the display label; kk is the language code for Kazakh.
  if (language === 'kz') return 'kk';
  return SUPPORTED_LANGUAGES.find((supported) => supported === language);
}

/**
 * Стартовый язык при загрузке модуля.
 * На web НЕ читаем localStorage здесь: при `expo export` нет `window`, в браузере он есть —
 * получался разный `lng` у пререндера и первого кадра → React #418 (hydration mismatch).
 * Сохранённый язык применяется после mount: `applyClientLanguagePreference()`.
 */
function getInitialLng(): string {
  if (Platform.OS === 'web') {
    return 'ru';
  }
  return (
    Localization.getLocales()
      .map((locale) => normalizeLanguage(locale.languageCode))
      .find(Boolean) ?? 'ru'
  );
}

/**
 * Только клиент, после гидрации: localStorage → иначе язык браузера.
 * Вызвать из root layout в `useEffect`.
 */
export function applyClientLanguagePreference(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  try {
    const stored = normalizeLanguage(localStorage.getItem(LANGUAGE_KEY));
    if (stored) {
      void i18n.changeLanguage(stored);
      return;
    }
  } catch {
    // ignore
  }

  const preferredLanguages =
    typeof navigator !== 'undefined'
      ? [...(navigator.languages ?? []), navigator.language]
      : [];
  const language =
    preferredLanguages.map(normalizeLanguage).find(Boolean) ?? 'ru';
  void i18n.changeLanguage(language);
}

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  lng: getInitialLng(),
  fallbackLng: 'ru',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export async function setLanguage(lng: AppLanguage) {
  // eslint-disable-next-line import/no-named-as-default-member
  await i18n.changeLanguage(lng);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      localStorage.setItem(LANGUAGE_KEY, lng);
    } catch {
      // ignore
    }
  }
}

export default i18n;
