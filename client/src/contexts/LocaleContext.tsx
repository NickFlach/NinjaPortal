import React, { createContext, useContext, useState, useCallback } from 'react';
import { IntlProvider } from 'react-intl';
import { LocaleType, messages, getPreferredLanguage } from '../i18n';

interface LocaleContextType {
  locale: LocaleType;
  setLocale: (locale: LocaleType) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>(getPreferredLanguage());

  const setLocale = useCallback((newLocale: LocaleType) => {
    setLocaleState(newLocale);
    localStorage.setItem('preferred-locale', newLocale);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <IntlProvider messages={messages[locale]} locale={locale}>
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
