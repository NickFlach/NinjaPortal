export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ClientInfo {
  address?: string;
  currentSong?: number;
  isPlaying?: boolean;
  coordinates?: Coordinates;
  countryCode?: string;
}

export type WebSocketMessage = 
  | { type: 'auth'; address: string }
  | { type: 'subscribe'; songId: number }
  | { type: 'sync'; songId: number; timestamp: number; playing: boolean }
  | { type: 'location_update'; coordinates: Coordinates; countryCode: string };

export type ServerMessage =
  | { type: 'stats_update'; data: LiveStats }
  | { type: 'sync'; songId: number; timestamp: number; playing: boolean };

export interface LiveStats {
  activeListeners: number;
  geotaggedListeners: number;
  anonymousListeners: number;
  listenersByCountry: Record<string, number>;
}
