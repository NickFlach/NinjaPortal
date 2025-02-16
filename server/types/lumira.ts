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

export interface LumiraDataPoint {
  timestamp: string;
  value: number;
  metric: string;
}

export interface LumiraMetric {
  name: string;
  data: LumiraDataPoint[];
}

export interface ProcessedMetrics {
  bucket: string;
  data_type: string;
  data_points: any[];
  count: number;
}
