import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { useMusicPlayer } from './MusicPlayerContext';

interface MusicSyncContextType {
  syncEnabled: boolean;
  toggleSync: () => void;
}

const MusicSyncContext = createContext<MusicSyncContextType | undefined>(undefined);

export function MusicSyncProvider({ children }: { children: React.ReactNode }) {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { address } = useAccount();
  const { currentSong, isPlaying, audioRef, togglePlay } = useMusicPlayer();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;
  const reconnectAttemptRef = useRef(0);
  const lastSyncRef = useRef<{ timestamp: number; playing: boolean } | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!syncEnabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    function connect() {
      try {
        // Construct WebSocket URL carefully
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        const wsPath = '/ws/music-sync';
        const wsUrl = `${wsProtocol}//${wsHost}${wsPath}`;

        console.log('Connecting to WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Connected to music sync server');
          reconnectAttemptRef.current = 0;
          if (address) {
            ws.send(JSON.stringify({ type: 'auth', address }));
          }
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = undefined;
          }
        };

        ws.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'sync' && audioRef.current && message.songId === currentSong?.id) {
              const currentTime = audioRef.current.currentTime;
              const timeDiff = Math.abs(currentTime - message.timestamp);

              // Prevent sync feedback loops
              const now = Date.now();
              if (lastSyncRef.current && 
                  now - lastSyncRef.current.timestamp < 1000 && 
                  lastSyncRef.current.playing === message.playing) {
                return;
              }

              // Only sync if time difference is significant
              if (timeDiff > 1) {
                audioRef.current.currentTime = message.timestamp;
              }

              // Handle play/pause state
              if (message.playing !== isPlaying) {
                await togglePlay();
              }

              // Update last sync state
              lastSyncRef.current = {
                timestamp: now,
                playing: message.playing
              };
            }
          } catch (error) {
            console.error('Error processing sync message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setSyncEnabled(false);
        };

        ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);

          if (syncEnabled && !reconnectTimeoutRef.current && reconnectAttemptRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = undefined;
              reconnectAttemptRef.current++;
              if (syncEnabled) {
                connect();
              }
            }, delay);
          } else if (reconnectAttemptRef.current >= maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            setSyncEnabled(false);
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setSyncEnabled(false);
      }
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
    };
  }, [syncEnabled, address, togglePlay, currentSong?.id, isPlaying]);

  // Send sync messages when playback state changes
  useEffect(() => {
    if (!syncEnabled || !wsRef.current || !currentSong || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Only send sync message if it's different from last sync
      const now = Date.now();
      if (lastSyncRef.current && 
          now - lastSyncRef.current.timestamp < 1000 && 
          lastSyncRef.current.playing === isPlaying) {
        return;
      }

      // Subscribe to current song
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        songId: currentSong.id
      }));

      // Send current playback state
      wsRef.current.send(JSON.stringify({
        type: 'sync',
        songId: currentSong.id,
        timestamp: audioRef.current?.currentTime || 0,
        playing: isPlaying
      }));

      // Update last sync state
      lastSyncRef.current = {
        timestamp: now,
        playing: isPlaying
      };
    } catch (error) {
      console.error('Error sending sync message:', error);
      setSyncEnabled(false);
    }
  }, [syncEnabled, currentSong?.id, isPlaying, audioRef.current?.currentTime]);

  const toggleSync = () => {
    setSyncEnabled(!syncEnabled);
  };

  return (
    <MusicSyncContext.Provider value={{ syncEnabled, toggleSync }}>
      {children}
    </MusicSyncContext.Provider>
  );
}

export function useMusicSync() {
  const context = useContext(MusicSyncContext);
  if (!context) {
    throw new Error('useMusicSync must be used within a MusicSyncProvider');
  }
  return context;
}