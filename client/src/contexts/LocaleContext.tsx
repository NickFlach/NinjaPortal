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

// Define supported locales to fix type issues
type SupportedLocale = 'en' | 'es';

// Minimal static translations for UI elements
const staticMessages: Record<SupportedLocale, Record<string, string>> = {
  en: {
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.retry': 'Retry',
    'common.translation.error': 'Translation unavailable',
    'app.songs': 'Songs',
    'app.upload': 'Upload',
    'app.discovery': 'Discovery',
    'app.recent': 'Recent',
    'app.title': 'Title',
    'app.disconnect': 'Disconnect',
    'app.connect': 'Connect',
    'app.library': 'Library',
    'storage.title': 'Storage',
    'storage.upload': 'Upload',
    'storage.noFiles': 'No files found',
    'app.network.setup': 'Network Setup',
    'app.network.configuring': 'Configuring Network',
    'app.welcome.back': 'Welcome Back',
    'map.title': 'Listener Map',
    'map.totalListeners': 'Total Listeners'
  },
  es: {
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.retry': 'Reintentar',
    'common.translation.error': 'Traducción no disponible',
    'app.songs': 'Canciones',
    'app.upload': 'Subir',
    'app.discovery': 'Descubrimiento',
    'app.recent': 'Reciente',
    'app.title': 'Título',
    'app.disconnect': 'Desconectar',
    'app.connect': 'Conectar',
    'app.library': 'Biblioteca',
    'storage.title': 'Almacenamiento',
    'storage.upload': 'Subir',
    'storage.noFiles': 'No se encontraron archivos',
    'app.network.setup': 'Configuración de Red',
    'app.network.configuring': 'Configurando Red',
    'app.welcome.back': 'Bienvenido de Nuevo',
    'map.title': 'Mapa de Oyentes',
    'map.totalListeners': 'Total de Oyentes'
  }
};

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
      const response = await fetch('https://api.cognitive.microsofttranslator.com/translate', {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': import.meta.env.VITE_TRANSLATION_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify([{
          text,
          to: targetLocale
        }])
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data: TranslationResponse[] = await response.json();
      const translatedText = data[0].translations[0].text;

      // Cache the result
      translationCache.set(cacheKey, {
        text: translatedText,
        timestamp: Date.now(),
      });

      return translatedText;
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

interface LocaleContextType {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
  translate: (text: string) => Promise<string>;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>('en');
  const [messages, setMessages] = useState(staticMessages[locale as SupportedLocale] || staticMessages.en);

  const setLocale = useCallback((newLocale: LocaleType) => {
    setLocaleState(newLocale);
    localStorage.setItem('preferred-locale', newLocale);
    setMessages(staticMessages[newLocale as SupportedLocale] || staticMessages.en);
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