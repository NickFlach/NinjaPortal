import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { useMusicPlayer } from './MusicPlayerContext';
import { CascadeController, type CascadeMetrics } from '@/lib/CascadeController';
import { ConnectionManager, type ConnectionType } from '@/lib/ConnectionManager';
import { AudioBufferController, type AudioQualityMetrics } from '@/lib/AudioBufferController';

export interface NetworkNode {
  id: string;
  latency: number;
  syncError: number;
  playbackRate: number;
  connectionType: ConnectionType;
}

interface MusicSyncContextType {
  syncEnabled: boolean;
  toggleSync: () => void;
  updateMetadata: (songId: number, metadata: { title: string; artist: string }) => Promise<void>;
  cascadeMetrics: CascadeMetrics;
  audioMetrics: AudioQualityMetrics;
  connectedNodes: NetworkNode[];
  updateControlParameters: (params: {
    innerLoop: { kp: number; ki: number; kd: number };
    outerLoop: { kp: number; ki: number; kd: number };
  }) => void;
  connectionType: ConnectionType;
  switchToBluetoothSync: () => Promise<boolean>;
}

const MusicSyncContext = createContext<MusicSyncContextType | undefined>(undefined);

export function MusicSyncProvider({ children }: { children: React.ReactNode }) {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [connectedNodes, setConnectedNodes] = useState<NetworkNode[]>([]);
  const [audioMetrics, setAudioMetrics] = useState<AudioQualityMetrics>({
    bufferHealth: 1,
    playbackStability: 1,
    dropoutCount: 0,
    jitterMs: 0
  });

  const wsRef = useRef<WebSocket | null>(null);
  const { address } = useAccount();
  const { currentSong, isPlaying, audioRef, togglePlay } = useMusicPlayer();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;
  const reconnectAttemptRef = useRef(0);
  const lastSyncRef = useRef<{ timestamp: number; playing: boolean } | null>(null);
  const cascadeController = useRef(new CascadeController());
  const connectionManager = useRef(new ConnectionManager());
  const audioBufferController = useRef<AudioBufferController | null>(null);

  const [cascadeMetrics, setCascadeMetrics] = useState<CascadeMetrics>({
    entropyError: 0,
    freeEnergyError: 0,
    entropyOutput: 0,
    freeEnergyOutput: 0,
    entropyIntegral: 0,
    freeEnergyIntegral: 0,
    entropyDerivative: 0,
    freeEnergyDerivative: 0
  });

  // Initialize audio buffer controller
  useEffect(() => {
    if (audioRef.current && !audioBufferController.current) {
      const audioContext = new AudioContext();
      audioBufferController.current = new AudioBufferController(audioContext);
    }
  }, [audioRef]);

  // Monitor audio quality metrics
  useEffect(() => {
    if (!syncEnabled || !audioBufferController.current) return;

    const interval = setInterval(() => {
      if (audioBufferController.current) {
        setAudioMetrics(audioBufferController.current.getMetrics());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [syncEnabled]);

  const updateControlParameters = (params: {
    innerLoop: { kp: number; ki: number; kd: number };
    outerLoop: { kp: number; ki: number; kd: number };
  }) => {
    cascadeController.current = new CascadeController(params.innerLoop, params.outerLoop);
  };

  const switchToBluetoothSync = async () => {
    const success = await connectionManager.current.connectBluetooth();
    if (success) {
      // Reinitialize sync with Bluetooth configuration
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      initializeSync();
    }
    return success;
  };

  // Calculate network metrics
  const calculateNetworkMetrics = (nodes: NetworkNode[]) => {
    if (nodes.length === 0) return { entropy: 0, freeEnergy: 0 };

    // Calculate entropy (flow diversity)
    const totalError = nodes.reduce((sum, node) => sum + Math.abs(node.syncError), 0);
    const normalizedErrors = nodes.map(node => Math.abs(node.syncError) / totalError);
    const entropy = -normalizedErrors.reduce((sum, p) =>
      sum + (p > 0 ? p * Math.log(p) : 0), 0);

    // Calculate free energy (signal speed)
    const avgPlaybackRate = nodes.reduce((sum, node) => sum + node.playbackRate, 0) / nodes.length;
    const avgLatency = nodes.reduce((sum, node) => sum + node.latency, 0) / nodes.length;
    const freeEnergy = avgLatency > 0 ? Math.log(avgPlaybackRate) / avgLatency : 0;

    return { entropy, freeEnergy };
  };

  const initializeSync = () => {
    if (!connectionManager.current.isValidConnection()) {
      console.error('Invalid connection type for sync');
      setSyncEnabled(false);
      return;
    }

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
          ws.send(JSON.stringify({
            type: 'auth',
            address,
            connectionType: connectionManager.current.getConnectionType()
          }));
        }
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'sync' && audioRef.current && message.songId === currentSong?.id) {
            // Calculate current network metrics
            const { entropy, freeEnergy } = calculateNetworkMetrics(message.nodes || []);

            // Target values (these could be adjusted based on network conditions)
            const targetFreeEnergy = 1.0; // Optimal signal speed

            // Use cascade controller to compute new playback rate
            const { playbackRate, metrics } = cascadeController.current.compute(
              targetFreeEnergy,
              freeEnergy,
              entropy
            );

            // Apply the computed playback rate through the buffer controller
            if (audioBufferController.current) {
              audioBufferController.current.adjustPlaybackRate(playbackRate);
            } else {
              audioRef.current.playbackRate = playbackRate;
            }

            // Update metrics for visualization
            setCascadeMetrics(metrics);

            // Update connected nodes information
            if (message.nodes) {
              setConnectedNodes(message.nodes.map((node: any) => ({
                id: node.address,
                latency: node.latency || 0,
                syncError: node.syncError || 0,
                playbackRate: node.playbackRate || 1.0,
                connectionType: node.connectionType || 'unknown'
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
        setConnectedNodes([]);

        if (syncEnabled && !reconnectTimeoutRef.current && reconnectAttemptRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
          console.log(`Attempting reconnect in ${delay}ms (attempt ${reconnectAttemptRef.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = undefined;
            reconnectAttemptRef.current++;
            if (syncEnabled) {
              initializeSync();
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

    initializeSync();

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
      cascadeController.current.reset();
      if (audioBufferController.current) {
        audioBufferController.current.reset();
      }
      setCascadeMetrics({
        entropyError: 0,
        freeEnergyError: 0,
        entropyOutput: 0,
        freeEnergyOutput: 0,
        entropyIntegral: 0,
        freeEnergyIntegral: 0,
        entropyDerivative: 0,
        freeEnergyDerivative: 0
      });
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
        cascadeMetrics,
        audioMetrics,
        connectedNodes,
        updateControlParameters,
        connectionType: connectionManager.current.getConnectionType(),
        switchToBluetoothSync
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