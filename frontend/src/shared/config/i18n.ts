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

const resources = {
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
  const device = Localization.getLocales()[0]?.languageCode?.slice(0, 2);
  return device === 'en' ? 'en' : 'ru';
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
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored === 'en' || stored === 'ru') {
      void i18n.changeLanguage(stored);
      return;
    }
  } catch {
    // ignore
  }

  const nav =
    typeof navigator !== 'undefined'
      ? navigator.language?.slice(0, 2).toLowerCase()
      : '';
  if (nav === 'en') {
    void i18n.changeLanguage('en');
  }
}

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources,
  lng: getInitialLng(),
  fallbackLng: 'ru',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export async function setLanguage(lng: 'ru' | 'en') {
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
