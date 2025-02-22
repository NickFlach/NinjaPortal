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
  SUPERPOSED: 'superposed',
  CLASSICAL: 'classical' // Added classical state for non-quantum operations
} as const;

interface DimensionalContextType {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  currentDimension: string;
  quantumState: typeof QUANTUM_STATES[keyof typeof QUANTUM_STATES];
  isQuantumEnabled: boolean;
}

const DimensionalContext = createContext<DimensionalContextType | undefined>(undefined);

// Cache with quantum state tracking
const translationCache: TranslationCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Prime dimension translations are used as fallback
const primeTranslations: Record<string, string> = {};

export function DimensionalProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>('en');
  const [currentDimension, setCurrentDimension] = useState('prime');
  const [quantumState, setQuantumState] = useState<typeof QUANTUM_STATES[keyof typeof QUANTUM_STATES]>(QUANTUM_STATES.CLASSICAL);
  const [isQuantumEnabled, setIsQuantumEnabled] = useState(false);

  // Initialize quantum capabilities
  useEffect(() => {
    const checkQuantumCapabilities = async () => {
      try {
        // Check if quantum computing is available
        const hasQuantum = 'crypto' in window && 'subtle' in window.crypto;
        setIsQuantumEnabled(hasQuantum);

        // Set initial state based on quantum availability
        setQuantumState(hasQuantum ? QUANTUM_STATES.COHERENT : QUANTUM_STATES.CLASSICAL);
      } catch (error) {
        console.warn('Quantum capabilities not available, falling back to classical mode');
        setIsQuantumEnabled(false);
        setQuantumState(QUANTUM_STATES.CLASSICAL);
      }
    };

    checkQuantumCapabilities();
  }, []);

  // Store key in prime dimension if not found
  const addToPrimeDimension = useCallback((key: string, value: string) => {
    if (!primeTranslations[key]) {
      primeTranslations[key] = value;
      console.log(`Added key "${key}" to prime dimension translations`);
    }
  }, []);

  // Translation function with quantum state awareness and prime dimension fallback
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    try {
      const currentMessages = messages[locale];
      if (!currentMessages) {
        console.error(`Dimension error: No translations found for locale ${locale}`);
        return key;
      }

      let translation = currentMessages[key as keyof typeof currentMessages];

      // Check cache first
      const cachedTranslation = translationCache[`${locale}.${key}`];
      if (cachedTranslation && Date.now() - cachedTranslation.timestamp < CACHE_DURATION) {
        translation = cachedTranslation.text;
      }

      // If no translation found, use prime dimension
      if (!translation) {
        translation = primeTranslations[key] || key;

        // Store the key itself as translation in prime dimension
        if (!primeTranslations[key]) {
          addToPrimeDimension(key, key);
        }
      }

      // Handle parameter interpolation
      if (params) {
        translation = Object.entries(params).reduce((acc: string, [param, value]) => {
          return acc.replace(`{${param}}`, String(value));
        }, translation as string);
      }

      // Cache successful translations
      translationCache[`${locale}.${key}`] = {
        text: translation as string,
        dimension: currentDimension,
        quantumState: quantumState,
        timestamp: Date.now()
      };

      return translation as string;
    } catch (error) {
      console.error('Translation error:', error);
      return key; // Failsafe: return the key if everything fails
    }
  }, [locale, currentDimension, quantumState, addToPrimeDimension]);

  // Update locale with dimensional synchronization
  const setLocale = useCallback((newLocale: LocaleType) => {
    try {
      setLocaleState(newLocale);
      localStorage.setItem('preferred-locale', newLocale);

      // Quantum state transition only if quantum computing is enabled
      if (isQuantumEnabled) {
        setQuantumState(QUANTUM_STATES.SUPERPOSED);
        setTimeout(() => {
          setQuantumState(QUANTUM_STATES.COHERENT);
        }, 100);
      }
    } catch (error) {
      console.error('Failed to update locale:', error);
      // Fallback to classical state
      setQuantumState(QUANTUM_STATES.CLASSICAL);
    }
  }, [isQuantumEnabled]);

  // Initialize with browser's dimensional coordinates
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
      setQuantumState(QUANTUM_STATES.CLASSICAL);
    }
  }, []);

  const value = {
    locale,
    setLocale,
    t,
    currentDimension,
    quantumState,
    isQuantumEnabled
  };

  return (
    <DimensionalContext.Provider value={value}>
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