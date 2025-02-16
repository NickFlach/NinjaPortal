import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { IntlProvider } from 'react-intl';
import { LocaleType } from '../i18n';

interface TranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface CachedTranslation {
  text: string;
  timestamp: number;
}

// Define supported locales
type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko';

// List of terms that should not be translated
const preservedTerms = [
  'ninja-portal',
  'Lumira',
  'PFORK',
  'NEO',
  'Flaukowski',
  'Plump'
];

// Simple in-memory cache
const translationCache = new Map<string, CachedTranslation>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function translateText(text: string, targetLocale: string): Promise<string> {
  // Don't translate if it's English or a preserved term
  if (targetLocale === 'en' || preservedTerms.includes(text)) {
    return text;
  }

  const cacheKey = `${text}_${targetLocale}`;
  const cached = translationCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.text;
  }

  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      // Make request to backend translation endpoint
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLanguage: targetLocale,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Translation API error (attempt ${attempts + 1}):`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Translation API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as TranslationResponse;
      const translatedText = data.translatedText;

      // Cache the result
      translationCache.set(cacheKey, {
        text: translatedText,
        timestamp: Date.now(),
      });

      console.log(`Translation successful (${targetLocale}):`, {
        original: text,
        translated: translatedText
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

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleType>('en');
  const [messages, setMessages] = useState(staticMessages[locale as SupportedLocale] || staticMessages.en);

  const setLocale = useCallback((newLocale: LocaleType) => {
    setLocaleState(newLocale);
    localStorage.setItem('preferred-locale', newLocale);
    setMessages(staticMessages[newLocale as SupportedLocale] || staticMessages.en);
  }, []);

  const translate = useCallback(async (text: string) => {
    if (!text) return '';
    try {
      return await translateText(text, locale);
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
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

// Static translations for UI elements
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
    'app.title': 'ninja-portal',  // Preserve brand name
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
    'map.totalListeners': 'Total Listeners',
    'nav.map': 'Map',
    'nav.analytics': 'Analytics',
    'nav.whitepaper': 'Whitepaper'
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
    'app.title': 'ninja-portal',  // Keep brand name untranslated
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
    'map.totalListeners': 'Total de Oyentes',
    'nav.map': 'Mapa',
    'nav.analytics': 'Analítica',
    'nav.whitepaper': 'Documento Técnico'
  },
  fr: {
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.retry': 'Réessayer',
    'common.translation.error': 'Traduction indisponible',
    'app.songs': 'Chansons',
    'app.upload': 'Télécharger',
    'app.discovery': 'Découverte',
    'app.recent': 'Récent',
    'app.title': 'ninja-portal',
    'app.disconnect': 'Déconnecter',
    'app.connect': 'Connecter',
    'app.library': 'Bibliothèque',
    'storage.title': 'Stockage',
    'storage.upload': 'Télécharger',
    'storage.noFiles': 'Aucun fichier trouvé',
    'app.network.setup': 'Configuration Réseau',
    'app.network.configuring': 'Configuration du Réseau',
    'app.welcome.back': 'Bon Retour',
    'map.title': 'Carte des Auditeurs',
    'map.totalListeners': 'Nombre Total d\'Auditeurs',
    'nav.map': 'Carte',
    'nav.analytics': 'Analytique',
    'nav.whitepaper': 'Livre Blanc'
  },
  de: {
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.retry': 'Wiederholen',
    'common.translation.error': 'Übersetzung nicht verfügbar',
    'app.songs': 'Lieder',
    'app.upload': 'Hochladen',
    'app.discovery': 'Entdeckung',
    'app.recent': 'Kürzlich',
    'app.title': 'ninja-portal',
    'app.disconnect': 'Trennen',
    'app.connect': 'Verbinden',
    'app.library': 'Bibliothek',
    'storage.title': 'Speicher',
    'storage.upload': 'Hochladen',
    'storage.noFiles': 'Keine Dateien gefunden',
    'app.network.setup': 'Netzwerk-Setup',
    'app.network.configuring': 'Netzwerk wird konfiguriert',
    'app.welcome.back': 'Willkommen zurück',
    'map.title': 'Hörer-Karte',
    'map.totalListeners': 'Gesamtzahl der Hörer',
    'nav.map': 'Karte',
    'nav.analytics': 'Analytik',
    'nav.whitepaper': 'Whitepaper'
  },
  it: {
    'common.loading': 'Caricamento...',
    'common.error': 'Errore',
    'common.retry': 'Riprova',
    'common.translation.error': 'Traduzione non disponibile',
    'app.songs': 'Canzoni',
    'app.upload': 'Carica',
    'app.discovery': 'Scoperta',
    'app.recent': 'Recente',
    'app.title': 'ninja-portal',
    'app.disconnect': 'Disconnetti',
    'app.connect': 'Connetti',
    'app.library': 'Libreria',
    'storage.title': 'Archivio',
    'storage.upload': 'Carica',
    'storage.noFiles': 'Nessun file trovato',
    'app.network.setup': 'Configurazione Rete',
    'app.network.configuring': 'Configurazione della Rete',
    'app.welcome.back': 'Bentornato',
    'map.title': 'Mappa Ascoltatori',
    'map.totalListeners': 'Totale Ascoltatori',
    'nav.map': 'Mappa',
    'nav.analytics': 'Analisi',
    'nav.whitepaper': 'Libro Bianco'
  },
  pt: {
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.retry': 'Tentar novamente',
    'common.translation.error': 'Tradução indisponível',
    'app.songs': 'Músicas',
    'app.upload': 'Enviar',
    'app.discovery': 'Descoberta',
    'app.recent': 'Recente',
    'app.title': 'ninja-portal',
    'app.disconnect': 'Desconectar',
    'app.connect': 'Conectar',
    'app.library': 'Biblioteca',
    'storage.title': 'Armazenamento',
    'storage.upload': 'Enviar',
    'storage.noFiles': 'Nenhum arquivo encontrado',
    'app.network.setup': 'Configuração de Rede',
    'app.network.configuring': 'Configurando Rede',
    'app.welcome.back': 'Bem-vindo de Volta',
    'map.title': 'Mapa de Ouvintes',
    'map.totalListeners': 'Total de Ouvintes',
    'nav.map': 'Mapa',
    'nav.analytics': 'Análise',
    'nav.whitepaper': 'Documento Técnico'
  },
  ru: {
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.retry': 'Повторить',
    'common.translation.error': 'Перевод недоступен',
    'app.songs': 'Песни',
    'app.upload': 'Загрузить',
    'app.discovery': 'Открытие',
    'app.recent': 'Недавние',
    'app.title': 'ninja-portal',
    'app.disconnect': 'Отключиться',
    'app.connect': 'Подключиться',
    'app.library': 'Библиотека',
    'storage.title': 'Хранилище',
    'storage.upload': 'Загрузить',
    'storage.noFiles': 'Файлы не найдены',
    'app.network.setup': 'Настройка Сети',
    'app.network.configuring': 'Настройка Сети',
    'app.welcome.back': 'С Возвращением',
    'map.title': 'Карта Слушателей',
    'map.totalListeners': 'Всего Слушателей',
    'nav.map': 'Карта',
    'nav.analytics': 'Аналитика',
    'nav.whitepaper': 'Техническая документация'
  },
  zh: {
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.retry': '重试',
    'common.translation.error': '翻译不可用',
    'app.songs': '歌曲',
    'app.upload': '上传',
    'app.discovery': '发现',
    'app.recent': '最近',
    'app.title': 'ninja-portal',
    'app.disconnect': '断开连接',
    'app.connect': '连接',
    'app.library': '库',
    'storage.title': '存储',
    'storage.upload': '上传',
    'storage.noFiles': '未找到文件',
    'app.network.setup': '网络设置',
    'app.network.configuring': '配置网络',
    'app.welcome.back': '欢迎回来',
    'map.title': '听众地图',
    'map.totalListeners': '总听众数',
    'nav.map': '地图',
    'nav.analytics': '分析',
    'nav.whitepaper': '白皮书'
  },
  ja: {
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.retry': '再試行',
    'common.translation.error': '翻訳不可',
    'app.songs': '曲',
    'app.upload': 'アップロード',
    'app.discovery': '発見',
    'app.recent': '最近',
    'app.title': 'ninja-portal',
    'app.disconnect': '切断',
    'app.connect': '接続',
    'app.library': 'ライブラリ',
    'storage.title': 'ストレージ',
    'storage.upload': 'アップロード',
    'storage.noFiles': 'ファイルが見つかりません',
    'app.network.setup': 'ネットワーク設定',
    'app.network.configuring': 'ネットワーク構成中',
    'app.welcome.back': 'お帰りなさい',
    'map.title': 'リスナーマップ',
    'map.totalListeners': '総リスナー数',
    'nav.map': '地図',
    'nav.analytics': '分析',
    'nav.whitepaper': '白書'
  },
  ko: {
    'common.loading': '로딩 중...',
    'common.error': '오류',
    'common.retry': '재시도',
    'common.translation.error': '번역 불가',
    'app.songs': '노래',
    'app.upload': '업로드',
    'app.discovery': '발견',
    'app.recent': '최근',
    'app.title': 'ninja-portal',
    'app.disconnect': '연결 해제',
    'app.connect': '연결',
    'app.library': '라이브러리',
    'storage.title': '저장소',
    'storage.upload': '업로드',
    'storage.noFiles': '파일을 찾을 수 없음',
    'app.network.setup': '네트워크 설정',
    'app.network.configuring': '네트워크 구성 중',
    'app.welcome.back': '돌아오신 것을 환영합니다',
    'map.title': '리스너 지도',
    'map.totalListeners': '총 리스너 수',
    'nav.map': '지도',
    'nav.analytics': '분석',
    'nav.whitepaper': '백서'
  }
};