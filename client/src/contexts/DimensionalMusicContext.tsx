import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useAccount } from 'wagmi';
import { playlistManager } from '@/lib/playlist';

interface DimensionalState {
  entropy: number;
  harmonicAlignment: number;
  dimensionalShift: number;
  quantumState: 'aligned' | 'shifting' | 'unstable';
}

interface DimensionalMusicContextType {
  currentDimension: string;
  dimensionalState: DimensionalState;
  syncWithDimension: (dimension: string) => Promise<void>;
  isDimensionallyAligned: boolean;
  dimensionalErrors: string[];
  currentPortalSignature: string | null;
}

const DimensionalMusicContext = createContext<DimensionalMusicContextType | undefined>(undefined);

export function DimensionalMusicProvider({ children }: { children: React.ReactNode }) {
  const [currentDimension, setCurrentDimension] = useState<string>('prime');
  const [currentPortalSignature, setCurrentPortalSignature] = useState<string | null>(null);
  const [dimensionalState, setDimensionalState] = useState<DimensionalState>({
    entropy: 0,
    harmonicAlignment: 1,
    dimensionalShift: 0,
    quantumState: 'aligned'
  });
  const [isDimensionallyAligned, setIsDimensionallyAligned] = useState(true);
  const [dimensionalErrors, setDimensionalErrors] = useState<string[]>([]);

  const { socket, isConnected } = useWebSocket();
  const { address } = useAccount();
  const dimensionalSyncRef = useRef<number>(0);

  const syncWithDimension = async (dimension: string) => {
    if (!socket || !isConnected) {
      throw new Error('Dimensional sync connection not available');
    }

    try {
      setDimensionalErrors([]);
      console.log('Starting dimensional sync for dimension:', dimension);

      socket.send({
        type: 'dimensional_sync_request',
        dimension,
        address,
        timestamp: Date.now(),
        syncId: ++dimensionalSyncRef.current
      });

      setCurrentDimension(dimension);
    } catch (error: unknown) {
      console.error('Dimensional sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDimensionalErrors(prev => [...prev, errorMessage]);
      setIsDimensionallyAligned(false);
    }
  };

  // Handle WebSocket messages for dimensional sync
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDimensionalMessage = (data: any) => {
      try {
        switch (data.type) {
          case 'dimensional_sync':
            console.log('Received dimensional sync:', data);
            setDimensionalState({
              entropy: data.entropy ?? 0,
              harmonicAlignment: data.harmonicAlignment ?? 1,
              dimensionalShift: data.dimensionalShift ?? 0,
              quantumState: data.quantumState ?? 'aligned'
            });
            setIsDimensionallyAligned(data.isAligned ?? true);
            if (data.portalSignature) {
              setCurrentPortalSignature(data.portalSignature);
            }
            break;
          case 'dimensional_error':
            console.error('Dimensional error:', data.message);
            setDimensionalErrors(prev => [...prev, data.message]);
            setIsDimensionallyAligned(false);
            break;
          default:
            // Ignore unknown message types
            break;
        }
      } catch (error) {
        console.error('Error processing dimensional sync message:', error);
        setDimensionalErrors(prev => [...prev, 'Error processing sync message']);
      }
    };

    socket.onMessage(handleDimensionalMessage);

    return () => {
      socket.onMessage(() => {}); // Cleanup listener
    };
  }, [socket, isConnected]);

  const contextValue = {
    currentDimension,
    dimensionalState,
    syncWithDimension,
    isDimensionallyAligned,
    dimensionalErrors,
    currentPortalSignature
  };

  return (
    <DimensionalMusicContext.Provider value={contextValue}>
      {children}
    </DimensionalMusicContext.Provider>
  );
}

export function useDimensionalMusic() {
  const context = useContext(DimensionalMusicContext);
  if (!context) {
    throw new Error('useDimensionalMusic must be used within a DimensionalMusicProvider');
  }
  return context;
}