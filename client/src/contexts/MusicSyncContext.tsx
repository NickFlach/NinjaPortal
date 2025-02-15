import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { useMusicPlayer } from './MusicPlayerContext';
import { PIDController } from '@/lib/PIDController';

interface NetworkNode {
  id: string;
  latency: number;
  syncError: number;
  playbackRate: number;
}

interface MusicSyncContextType {
  syncEnabled: boolean;
  toggleSync: () => void;
  updateMetadata: (songId: number, metadata: { title: string; artist: string }) => Promise<void>;
  pidMetrics: {
    error: number;
    output: number;
    parameters: {
      kp: number;
      ki: number;
      kd: number;
    };
  };
  connectedNodes: NetworkNode[];
  updatePIDParameters: (params: { kp: number; ki: number; kd: number }) => void;
}

const MusicSyncContext = createContext<MusicSyncContextType | undefined>(undefined);

export function MusicSyncProvider({ children }: { children: React.ReactNode }) {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [connectedNodes, setConnectedNodes] = useState<NetworkNode[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const { address } = useAccount();
  const { currentSong, isPlaying, audioRef, togglePlay } = useMusicPlayer();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;
  const reconnectAttemptRef = useRef(0);
  const lastSyncRef = useRef<{ timestamp: number; playing: boolean } | null>(null);
  const pidController = useRef<PIDController>(new PIDController());
  const [pidMetrics, setPidMetrics] = useState({
    error: 0,
    output: 0,
    parameters: {
      kp: 0.5,
      ki: 0.2,
      kd: 0.1
    }
  });

  const updatePIDParameters = (params: { kp: number; ki: number; kd: number }) => {
    pidController.current = new PIDController(params.kp, params.ki, params.kd);
    setPidMetrics(prev => ({
      ...prev,
      parameters: params
    }));
  };

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
              const targetTime = message.timestamp;

              console.log('Sync adjustment:', {
                targetTime,
                currentTime,
                newRate: pidController.current.compute(targetTime, currentTime),
                diff: targetTime - currentTime
              });

              // Use PID controller to adjust playback rate and capture metrics
              const newRate = pidController.current.compute(targetTime, currentTime);
              audioRef.current.playbackRate = newRate;

              // Update PID metrics
              setPidMetrics(prev => ({
                ...prev,
                error: targetTime - currentTime,
                output: newRate - 1 // Normalize around 1.0
              }));

              // Update connected nodes information
              if (message.nodes) {
                setConnectedNodes(message.nodes.map((node: any) => ({
                  id: node.address,
                  latency: node.latency || 0,
                  syncError: node.syncError || 0,
                  playbackRate: node.playbackRate || 1.0
                })));
              }

              // Handle play/pause state
              if (message.playing !== isPlaying) {
                await togglePlay();
              }

              lastSyncRef.current = {
                timestamp: Date.now(),
                playing: message.playing
              };
            }
          } catch (error) {
            console.error('Error processing sync message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          setConnectedNodes([]); // Clear connected nodes on disconnect

          // Only attempt reconnect if sync is still enabled and we haven't exceeded max attempts
          if (syncEnabled && !reconnectTimeoutRef.current && reconnectAttemptRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
            console.log(`Attempting reconnect in ${delay}ms (attempt ${reconnectAttemptRef.current + 1}/${maxReconnectAttempts})`);

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

  const toggleSync = () => {
    setSyncEnabled(!syncEnabled);
    if (!syncEnabled) {
      pidController.current.reset();
      setPidMetrics(prev => ({
        ...prev,
        error: 0,
        output: 0
      }));
    }
  };

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

  return (
    <MusicSyncContext.Provider 
      value={{ 
        syncEnabled, 
        toggleSync, 
        updateMetadata, 
        pidMetrics,
        connectedNodes,
        updatePIDParameters
      }}
    >
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