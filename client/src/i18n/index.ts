import { createIntl, createIntlCache } from 'react-intl';
import en from './messages/en';
import es from './messages/es';

export const messages = {
  en,
  es,
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
