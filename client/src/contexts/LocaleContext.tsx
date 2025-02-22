import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { IntlProvider } from 'react-intl';
import { LocaleType, messages } from '../i18n';
import { apiRequest } from '@/lib/queryClient';

interface LumiraTranslation {
  text: string;
  confidence: number;
  timestamp: number;
}

interface TranslationCache {
  [key: string]: LumiraTranslation;
}

// Cache with expiration
const translationCache: TranslationCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface LumiraContextType {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
  t: (key: string, params?: Record<string, string | number>) => Promise<string>;
  isLoading: boolean;
}

const LumiraContext = createContext<LumiraContextType | undefined>(undefined);

export function LumiraProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>('en');
  const [isLoading, setIsLoading] = useState(false);

  // Translation function with Lumira integration
  const t = useCallback(async (key: string, params?: Record<string, string | number>): Promise<string> => {
    try {
      // Check cache first
      const cacheKey = `${locale}.${key}`;
      const cachedTranslation = translationCache[cacheKey];
      if (cachedTranslation && Date.now() - cachedTranslation.timestamp < CACHE_DURATION) {
        let translation = cachedTranslation.text;

        // Handle parameter interpolation
        if (params) {
          translation = Object.entries(params).reduce((acc: string, [param, value]) => {
            return acc.replace(`{${param}}`, String(value));
          }, translation);
        }

        return translation;
      }

      setIsLoading(true);

      // Get translation from Lumira API
      const response = await apiRequest<{
        translation: string;
        confidence: number;
        metrics?: Record<string, number>;
        error?: string;
      }>('POST', '/api/lumira/translate', {
        body: {
          key,
          targetLocale: locale,
          params
        }
      });

      // Cache successful translations
      if (response.translation) {
        translationCache[cacheKey] = {
          text: response.translation,
          confidence: response.confidence,
          timestamp: Date.now()
        };

        return response.translation;
      }

      // Fallback to static translations if API fails
      return messages[locale]?.[key as keyof typeof messages[typeof locale]] || key;
    } catch (error) {
      console.error('Translation error:', error);
      // Fallback to static translations
      const fallbackTranslation = messages[locale]?.[key as keyof typeof messages[typeof locale]] || key;
      return typeof fallbackTranslation === 'string' ? fallbackTranslation : key;
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  // Update locale with proper error handling
  const setLocale = useCallback((newLocale: LocaleType) => {
    try {
      setLocaleState(newLocale);
      localStorage.setItem('preferred-locale', newLocale);
    } catch (error) {
      console.error('Failed to update locale:', error);
    }
  }, []);

  // Initialize with browser's locale
  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem('preferred-locale') as LocaleType;
      if (savedLocale && messages[savedLocale]) {
        setLocaleState(savedLocale);
      } else {
        const browserLocale = navigator.language.split('-')[0] as LocaleType;
        setLocaleState(messages[browserLocale] ? browserLocale : 'en');
      }
    } catch (error) {
      console.error('Failed to initialize locale:', error);
      setLocaleState('en'); // Fallback to English
    }
  }, []);

  return (
    <LumiraContext.Provider value={{
      locale,
      setLocale,
      t,
      isLoading
    }}>
      <IntlProvider
        messages={messages[locale]}
        locale={locale}
        defaultLocale="en"
        onError={(err) => {
          console.warn('IntlProvider error:', err);
          // Don't throw errors, just log them
        }}
      >
        {children}
      </IntlProvider>
    </LumiraContext.Provider>
  );
}

export function useLumiraTranslation() {
  const context = useContext(LumiraContext);
  if (context === undefined) {
    throw new Error('useLumiraTranslation must be used within a LumiraProvider');
  }
  return context;
}