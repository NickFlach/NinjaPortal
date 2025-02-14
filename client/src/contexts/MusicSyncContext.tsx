import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { useMusicPlayer } from './MusicPlayerContext';
import { PIDController } from '@/lib/PIDController';

interface MusicSyncContextType {
  syncEnabled: boolean;
  toggleSync: () => void;
  updateMetadata: (songId: number, metadata: { title: string; artist: string }) => Promise<void>;
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
  const pidController = useRef<PIDController>(new PIDController());

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
        // Get the current hostname and port
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

              // Use PID controller to adjust playback rate
              const newRate = pidController.current.compute(message.timestamp, currentTime);
              audioRef.current.playbackRate = newRate;

              // Handle play/pause state
              if (message.playing !== isPlaying) {
                await togglePlay();
              }

              // Update last sync state
              lastSyncRef.current = {
                timestamp: Date.now(),
                playing: message.playing
              };
            } else if (message.type === 'storage_status') {
              console.log('Storage status update:', message.data);
              // Handle NEO FS storage status updates
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
          console.log('WebSocket disconnected:', event.code, event.reason);

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

  // Update metadata function
  const updateMetadata = async (songId: number, metadata: { title: string; artist: string }) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to sync server');
    }

    wsRef.current.send(JSON.stringify({
      type: 'update_metadata',
      songId,
      metadata
    }));
  };

  const toggleSync = () => {
    setSyncEnabled(!syncEnabled);
    if (!syncEnabled) {
      pidController.current.reset();
    }
  };

  return (
    <MusicSyncContext.Provider value={{ syncEnabled, toggleSync, updateMetadata }}>
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