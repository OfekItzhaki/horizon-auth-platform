import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import {
    resources,
    supportedLanguages as sharedSupportedLanguages,
    isRtlLanguage,
    normalizeLanguage,
} from '@tasks-management/frontend-services';

export const supportedLanguages = sharedSupportedLanguages;

function applyDocumentDirection(language: string) {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = normalizeLanguage(language);
    document.documentElement.dir = isRtlLanguage(language) ? 'rtl' : 'ltr';
}

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    })
    .then(() => applyDocumentDirection(i18n.language));

i18n.on('languageChanged', (lng) => applyDocumentDirection(lng));

export default i18n;
