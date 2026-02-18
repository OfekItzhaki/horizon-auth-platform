import en from './en';
import he from './he';

export const resources = {
  en: { translation: en },
  he: { translation: he },
} as const;

export type SupportedLanguage = keyof typeof resources;

export const supportedLanguages = Object.keys(resources) as SupportedLanguage[];

export const defaultLanguage: SupportedLanguage = 'en';

export function normalizeLanguage(lng: string | undefined | null): SupportedLanguage {
  const base = (lng ?? defaultLanguage).split('-')[0];
  return supportedLanguages.includes(base as SupportedLanguage)
    ? (base as SupportedLanguage)
    : defaultLanguage;
}

export function isRtlLanguage(lng: string | undefined | null): boolean {
  return normalizeLanguage(lng) === 'he';
}
