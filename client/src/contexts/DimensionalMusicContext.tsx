import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useAccount } from 'wagmi';

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
}

const DimensionalMusicContext = createContext<DimensionalMusicContextType | undefined>(undefined);

export function DimensionalMusicProvider({ children }: { children: React.ReactNode }) {
  const [currentDimension, setCurrentDimension] = useState<string>('prime');
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

  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('WebSocket not connected, skipping dimensional sync setup');
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'dimensional_sync':
            setDimensionalState({
              entropy: data.entropy ?? 0,
              harmonicAlignment: data.harmonicAlignment ?? 1,
              dimensionalShift: data.dimensionalShift ?? 0,
              quantumState: data.quantumState ?? 'aligned'
            });
            setIsDimensionallyAligned(data.isAligned ?? true);
            break;
          case 'dimensional_error':
            setDimensionalErrors(prev => [...prev, data.message]);
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('Error handling dimensional sync message:', error);
        setDimensionalErrors(prev => [...prev, 'Error processing sync message']);
      }
    };

    console.log('Setting up dimensional sync WebSocket listener');
    socket.addEventListener('message', handleMessage);

    return () => {
      console.log('Cleaning up dimensional sync WebSocket listener');
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, isConnected]);

  const syncWithDimension = async (dimension: string) => {
    try {
      if (!socket || !isConnected) {
        throw new Error('Dimensional sync connection not available');
      }

      // Clear previous errors
      setDimensionalErrors([]);

      // Request dimensional sync
      socket.send(JSON.stringify({
        type: 'dimensional_sync_request',
        dimension,
        address,
        timestamp: Date.now(),
        syncId: ++dimensionalSyncRef.current
      }));

      setCurrentDimension(dimension);
    } catch (error) {
      console.error('Dimensional sync error:', error);
      setDimensionalErrors(prev => [...prev, 'Failed to sync with dimension']);
    }
  };

  return (
    <DimensionalMusicContext.Provider
      value={{
        currentDimension,
        dimensionalState,
        syncWithDimension,
        isDimensionallyAligned,
        dimensionalErrors
      }}
    >
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