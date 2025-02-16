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

export interface StandardizedData {
  type: 'gps' | 'playback';
  timestamp: string;
  data: Record<string, any>;
  metadata: {
    source: string;
    processed: boolean;
    [key: string]: any;
  };
}

// Updated to support privacy-preserving metrics
export interface LumiraMetrics {
  count: number;
  aggregates: {
    avgAccuracy?: number;
    avgSpeed?: number;
    playingPercentage?: number;
    [key: string]: number | undefined;
  };
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
  aggregatedMetrics: LumiraMetrics;
}