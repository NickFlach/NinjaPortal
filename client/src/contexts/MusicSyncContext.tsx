import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useMusicPlayer } from './MusicPlayerContext';

interface MusicSyncContextType {
  syncEnabled: boolean;
  toggleSync: () => void;
}

const MusicSyncContext = createContext<MusicSyncContextType | undefined>(undefined);

export function MusicSyncProvider({ children }: { children: React.ReactNode }) {
  const [syncEnabled, setSyncEnabled] = React.useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { address } = useAccount();
  const { currentSong, isPlaying, audioRef } = useMusicPlayer();
  
  // Initialize WebSocket connection
  useEffect(() => {
    if (!syncEnabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/music-sync`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Connected to music sync server');
      if (address) {
        ws.send(JSON.stringify({ type: 'auth', address }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'sync' && audioRef.current && message.songId === currentSong?.id) {
          if (message.playing) {
            const currentTime = audioRef.current.currentTime;
            const timeDiff = Math.abs(currentTime - message.timestamp);
            
            // Only sync if time difference is significant (>1 second)
            if (timeDiff > 1) {
              audioRef.current.currentTime = message.timestamp;
            }
            audioRef.current.play();
          } else {
            audioRef.current.pause();
          }
        }
      } catch (error) {
        console.error('Error processing sync message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setSyncEnabled(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [syncEnabled, address]);

  // Send sync messages when playback state changes
  useEffect(() => {
    if (!syncEnabled || !wsRef.current || !currentSong || wsRef.current.readyState !== WebSocket.OPEN) {
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
