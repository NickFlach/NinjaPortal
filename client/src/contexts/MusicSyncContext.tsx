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
  const { currentSong, isPlaying, audioRef } = useMusicPlayer();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;
  const reconnectAttemptRef = useRef(0);

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
        console.log('Attempting to connect to WebSocket server...');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/music-sync`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Connected to music sync server');
          reconnectAttemptRef.current = 0; // Reset reconnect attempts on successful connection
          if (address) {
            ws.send(JSON.stringify({ type: 'auth', address }));
          }
          // Clear reconnect timeout if connection successful
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = undefined;
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'sync' && audioRef.current && message.songId === currentSong?.id) {
              const currentTime = audioRef.current.currentTime;
              const timeDiff = Math.abs(currentTime - message.timestamp);

              // Only sync if time difference is significant (>1 second)
              if (timeDiff > 1) {
                audioRef.current.currentTime = message.timestamp;
              }

              if (message.playing && !isPlaying) {
                audioRef.current.play().catch(console.error);
              } else if (!message.playing && isPlaying) {
                audioRef.current.pause();
              }
            }
          } catch (error) {
            console.error('Error processing sync message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);

          // Attempt to reconnect if not manually disabled and within max attempts
          if (syncEnabled && !reconnectTimeoutRef.current && reconnectAttemptRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptRef.current + 1}/${maxReconnectAttempts})`);

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
  }, [syncEnabled, address]);

  // Send sync messages when playback state changes
  useEffect(() => {
    if (!syncEnabled || !wsRef.current || !currentSong) {
      return;
    }

    if (wsRef.current.readyState === WebSocket.OPEN) {
      try {
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
      } catch (error) {
        console.error('Error sending sync message:', error);
        setSyncEnabled(false);
      }
    }
  }, [syncEnabled, currentSong?.id, isPlaying]);

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