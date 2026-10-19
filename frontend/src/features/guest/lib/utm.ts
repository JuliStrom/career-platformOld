import { Platform } from 'react-native';

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ref?: string;
}

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

const REF_KEYS = ['ref', 'referral', 'invite'] as const;

/**
 * Достаёт UTM-метки и реферальный код из текущего URL.
 * На web — из window.location.search, на native — из Expo Linking (initial URL).
 */
export function parseUtmFromUrl(url?: string | null): UtmParams {
  const raw = url ?? getCurrentUrl();
  if (!raw) return {};

  const query = raw.split('?')[1];
  if (!query) return {};

  const params = new URLSearchParams(query);
  const result: UtmParams = {};

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) result[key] = value;
  }

  for (const key of REF_KEYS) {
    const value = params.get(key);
    if (value) {
      result.ref = value;
      break;
    }
  }

  return result;
}

function getCurrentUrl(): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.href;
  }
  return null;
}

export function hasUtmParams(params: UtmParams): boolean {
  return Object.keys(params).length > 0;
}
