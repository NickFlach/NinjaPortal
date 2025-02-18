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
            if (data.portalSignature) {
              setCurrentPortalSignature(data.portalSignature);
            }
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

    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, isConnected]);

  const syncWithDimension = async (dimension: string) => {
    try {
      if (!socket || !isConnected) {
        throw new Error('Dimensional sync connection not available');
      }

      setDimensionalErrors([]);

      socket.send(JSON.stringify({
        type: 'dimensional_sync_request',
        dimension,
        address,
        timestamp: Date.now(),
        syncId: ++dimensionalSyncRef.current
      }));

      setCurrentDimension(dimension);

      // Request new portal signature for the dimension
      if (address) {
        const proof = await playlistManager.generateZKProof({
          dimension,
          address,
          timestamp: Date.now()
        });

        socket.send(JSON.stringify({
          type: 'portal_signature_request',
          proof,
          dimension
        }));
      }
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
        dimensionalErrors,
        currentPortalSignature
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