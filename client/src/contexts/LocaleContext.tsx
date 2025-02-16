import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { IntlProvider } from 'react-intl';
import { LocaleType } from '../i18n';

// Translation service types
interface TranslationResponse {
  translations: Array<{
    text: string;
    to: string;
  }>;
}

interface TranslationError extends Error {
  code: string;
  details?: unknown;
}

interface CachedTranslation {
  text: string;
  timestamp: number;
}

// Minimal static translations for UI elements
const staticMessages = {
  en: {
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.retry': 'Retry',
    'common.translation.error': 'Translation unavailable',
  },
  es: {
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.retry': 'Reintentar',
    'common.translation.error': 'Traducción no disponible',
  },
  // Add other languages as needed
};

interface LocaleContextType {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
  translate: (text: string) => Promise<string>;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// Simple in-memory cache with proper typing
const translationCache = new Map<string, CachedTranslation>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateText(text: string, targetLocale: string): Promise<string> {
  if (targetLocale === 'en') return text;

  const cacheKey = `${text}_${targetLocale}`;
  const cached = translationCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.text;
  }

  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      // Here we'll make the API call when we have the key
      // For now, return the original text and log that we need API integration
      console.log('Translation API call would be made here:', { text, targetLocale });

      // Cache the result
      translationCache.set(cacheKey, {
        text: text, // Replace with actual translation when API is integrated
        timestamp: Date.now(),
      });

      return text;
    } catch (error) {
      attempts++;
      console.error(`Translation attempt ${attempts} failed:`, error);

      if (attempts === MAX_RETRIES) {
        console.error('Translation failed after max retries:', error);
        return text;
      }

      // Exponential backoff
      await sleep(RETRY_DELAY * Math.pow(2, attempts - 1));
    }
  }

  return text; // Fallback to original text if all retries fail
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>('en');
  const [messages, setMessages] = useState(staticMessages[locale] || staticMessages.en);

  const setLocale = useCallback((newLocale: LocaleType) => {
    setLocaleState(newLocale);
    localStorage.setItem('preferred-locale', newLocale);
    setMessages(staticMessages[newLocale] || staticMessages.en);
  }, []);

  const translate = useCallback(async (text: string) => {
    return translateText(text, locale);
  }, [locale]);

  useEffect(() => {
    const savedLocale = localStorage.getItem('preferred-locale') as LocaleType;
    if (savedLocale) {
      setLocaleState(savedLocale);
    } else {
      const browserLocale = navigator.language.split('-')[0] as LocaleType;
      setLocaleState(browserLocale in staticMessages ? browserLocale : 'en');
    }
  }, []);

  const value = {
    locale,
    setLocale,
    translate,
  };

  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider messages={messages} locale={locale} defaultLocale="en">
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}