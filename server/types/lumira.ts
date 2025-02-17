export interface GpsData {
  coordinates: {
    lat: number;
    lng: number;
  };
  countryCode: string;
  accuracy?: number;
  speed?: number;
  source?: string;
}

export interface PlaybackData {
  songId: number;
  position: number;
  isPlaying: boolean;
  volume?: number;
  source?: string;
}

export interface DimensionalReflectionData {
  sourceId: string;
  energy: number;
  dimensionId: number;
  dimensionalEnergy: number;
  equilibrium: number;
}

export interface DimensionalEvolutionData {
  dimensionId: number;
  energy: number;
  equilibrium: number;
  pressure: number;
  reflectionCount: number;
}

export interface ExperienceData {
  type: 'audio' | 'visual' | 'interaction';
  sentiment: number;
  intensity: number;
  context: string;
  location?: string;
  songId?: number;
}

export interface CodePatternData {
  pattern: string;
  context: string;
  success: boolean;
  impact: number;
}

export interface TranslationMetricData {
  sourceLanguage: string;
  targetLanguage: string;
  success: boolean;
  text: string;
}

export interface StandardizedData {
  type: 'gps' | 'playback' | 'reflection' | 'evolution' | 'experience' | 'code' | 'translation';
  timestamp: string;
  data: GpsData | PlaybackData | DimensionalReflectionData | DimensionalEvolutionData | 
        ExperienceData | CodePatternData | TranslationMetricData;
  metadata: {
    source: string;
    processed: boolean;
    quantumState?: number;
    dimensionalContext?: {
      currentDimensions: number;
      totalEnergy: number;
      systemEquilibrium: number;
    };
    [key: string]: any;
  };
}

export interface LumiraMetrics {
  count: number;
  aggregates: Record<string, number>;
  lastUpdated: Date;
}

export interface AggregatedMetric {
  bucket: string;
  data_type: string;
  aggregates: Record<string, number>;
  count: number;
}

export interface ProcessedMetrics {
  success: boolean;
  aggregatedMetrics: {
    count: number;
    aggregates: Record<string, number>;
    lastUpdated: Date;
  };
}