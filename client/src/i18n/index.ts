import { createIntl, createIntlCache } from 'react-intl';
import en from './messages/en';
import es from './messages/es';
import zh from './messages/zh';
import ja from './messages/ja';
import ko from './messages/ko'; // Added Korean
import fr from './messages/fr'; // Added French


export const messages = {
  en,
  es,
  zh,
  ja,
  ko, // Added Korean
  fr, // Added French
} as const;

export type LocaleType = keyof typeof messages;
export type MessageKeys = keyof typeof messages.en;

// Create the cache once
const cache = createIntlCache();

// Create a function to get intl instance based on locale
export function getIntl(locale: LocaleType) {
  return createIntl(
    {
      locale,
      messages: messages[locale],
    },
    cache
  );
}

// Language names in their native form
export const languageNames = {
  en: 'English',
  es: 'Español',
  zh: '中文',
  ja: '日本語',
  ko: '한국어', // Added Korean
  fr: 'Français', // Added French
} as const;

// Function to detect user's preferred language
export function getPreferredLanguage(): LocaleType {
  const savedLocale = localStorage.getItem('preferred-locale') as LocaleType;
  if (savedLocale && messages[savedLocale]) {
    return savedLocale;
  }

  const browserLocale = navigator.language.split('-')[0] as LocaleType;
  return messages[browserLocale] ? browserLocale : 'en';
}

// Function to set user's preferred language
export function setPreferredLanguage(locale: LocaleType) {
  localStorage.setItem('preferred-locale', locale);
}