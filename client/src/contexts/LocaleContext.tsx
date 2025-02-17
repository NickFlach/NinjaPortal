import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { IntlProvider } from 'react-intl';
import { LocaleType, messages, getIntl } from '../i18n';

interface DimensionalTranslation {
  text: string;
  dimension: string;
  quantumState: string;
  timestamp: number;
}

interface TranslationCache {
  [key: string]: DimensionalTranslation;
}

// Quantum states for translation coherence
const QUANTUM_STATES = {
  COHERENT: 'coherent',
  DECOHERENT: 'decoherent',
  SUPERPOSED: 'superposed'
} as const;

interface DimensionalContextType {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  currentDimension: string;
  quantumState: typeof QUANTUM_STATES[keyof typeof QUANTUM_STATES];
}

const DimensionalContext = createContext<DimensionalContextType | undefined>(undefined);

// Cache with quantum state tracking
const translationCache: TranslationCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function DimensionalProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>('en');
  const [currentDimension, setCurrentDimension] = useState('prime');
  const [quantumState, setQuantumState] = useState<typeof QUANTUM_STATES[keyof typeof QUANTUM_STATES]>(QUANTUM_STATES.COHERENT);

  // Translation function with quantum state awareness
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const currentMessages = messages[locale];
    if (!currentMessages) {
      console.error(`Dimension error: No translations found for locale ${locale}`);
      return key;
    }

    const translation = currentMessages[key as keyof typeof currentMessages];
    if (!translation) {
      console.error(`Quantum state error: Translation key "${key}" not found in dimension ${currentDimension}`);
      return key;
    }

    // Handle parameter interpolation with quantum state verification
    if (params) {
      return Object.entries(params).reduce((acc: string, [param, value]) => {
        return acc.replace(`{${param}}`, String(value));
      }, translation as string);
    }

    return translation as string;
  }, [locale, currentDimension]);

  // Update locale with dimensional synchronization
  const setLocale = useCallback((newLocale: LocaleType) => {
    setLocaleState(newLocale);
    localStorage.setItem('preferred-locale', newLocale);

    // Quantum state transition
    setQuantumState(QUANTUM_STATES.SUPERPOSED);
    setTimeout(() => {
      setQuantumState(QUANTUM_STATES.COHERENT);
    }, 100);
  }, []);

  // Initialize with browser's dimensional coordinates
  useEffect(() => {
    const savedLocale = localStorage.getItem('preferred-locale') as LocaleType;
    if (savedLocale && messages[savedLocale]) {
      setLocaleState(savedLocale);
    } else {
      const browserLocale = navigator.language.split('-')[0] as LocaleType;
      setLocaleState(messages[browserLocale] ? browserLocale : 'en');
    }

    // Initialize quantum state
    setQuantumState(QUANTUM_STATES.COHERENT);
  }, []);

  const value = {
    locale,
    setLocale,
    t,
    currentDimension,
    quantumState
  };

  // Wrap children with IntlProvider using current locale messages
  return (
    <DimensionalContext.Provider value={value}>
      <IntlProvider
        messages={messages[locale]}
        locale={locale}
        defaultLocale="en"
      >
        {children}
      </IntlProvider>
    </DimensionalContext.Provider>
  );
}

export function useDimensionalTranslation() {
  const context = useContext(DimensionalContext);
  if (context === undefined) {
    throw new Error('useDimensionalTranslation must be used within a DimensionalProvider');
  }
  return context;
}