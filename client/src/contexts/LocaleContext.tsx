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

interface TranslationState {
  [key: string]: {
    loading: boolean;
    error?: string;
    text?: string;
  };
}

// Cache with expiration
const translationCache: TranslationCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface LumiraContextType {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translate: (key: string, params?: Record<string, string | number>) => Promise<string>;
  isLoading: boolean;
  translationState: TranslationState;
}

const LumiraContext = createContext<LumiraContextType | undefined>(undefined);

export function LumiraProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [translationState, setTranslationState] = useState<TranslationState>({});

  // Synchronous translation function - returns immediately from cache or fallback
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const cacheKey = `${locale}.${key}`;
    const cachedTranslation = translationCache[cacheKey];

    // Use cached translation if valid
    if (cachedTranslation && Date.now() - cachedTranslation.timestamp < CACHE_DURATION) {
      let translation = cachedTranslation.text;
      if (params) {
        translation = Object.entries(params).reduce((acc: string, [param, value]) => {
          return acc.replace(`{${param}}`, String(value));
        }, translation);
      }
      return translation;
    }

    // Fallback to static translations or key
    const fallback = messages[locale]?.[key as keyof typeof messages[typeof locale]] || key;
    return typeof fallback === 'string' ? fallback : key;
  }, [locale]);

  // Asynchronous translation function - updates state when translation arrives
  const translate = useCallback(async (key: string, params?: Record<string, string | number>): Promise<string> => {
    const cacheKey = `${locale}.${key}`;

    try {
      setTranslationState(prev => ({
        ...prev,
        [key]: { loading: true }
      }));

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

      if (response.translation) {
        // Cache successful translations
        translationCache[cacheKey] = {
          text: response.translation,
          confidence: response.confidence,
          timestamp: Date.now()
        };

        setTranslationState(prev => ({
          ...prev,
          [key]: { loading: false, text: response.translation }
        }));

        return response.translation;
      }

      // Fallback to static translations
      const fallback = t(key, params);
      setTranslationState(prev => ({
        ...prev,
        [key]: { loading: false, text: fallback }
      }));

      return fallback;
    } catch (error) {
      console.error('Translation error:', error);
      const fallback = t(key, params);

      setTranslationState(prev => ({
        ...prev,
        [key]: { 
          loading: false, 
          text: fallback,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));

      return fallback;
    }
  }, [locale, t]);

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
      translate,
      isLoading,
      translationState
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

// Export DimensionalProvider as an alias for LumiraProvider
export const DimensionalProvider = LumiraProvider;

// Export useDimensionalTranslation as an alias for useLumiraTranslation
export const useDimensionalTranslation = useLumiraTranslation;