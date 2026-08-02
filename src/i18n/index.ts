import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { UiLanguage } from '@/lib/types';
import en from './locales/en';
import de from './locales/de';
import ar from './locales/ar';
import fr from './locales/fr';

export const LANGUAGES: { code: UiLanguage; label: string; dir: 'ltr' | 'rtl' }[] =
  [
    { code: 'en', label: 'English', dir: 'ltr' },
    { code: 'de', label: 'Deutsch', dir: 'ltr' },
    { code: 'ar', label: 'العربية', dir: 'rtl' },
    { code: 'fr', label: 'Français', dir: 'ltr' },
  ];

const RTL_LANGS: UiLanguage[] = ['ar'];

export function dirFor(lang: UiLanguage): 'ltr' | 'rtl' {
  return RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
}

export function applyDocumentLang(lang: UiLanguage): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = dirFor(lang);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    ar: { translation: ar },
    fr: { translation: fr },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
