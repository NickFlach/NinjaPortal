import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { playlistManager } from "@/lib/playlist";
import { useAccount } from 'wagmi';
import { useDimensionalMusic } from './DimensionalMusicContext';

interface DimensionalTrack {
  id: number;
  ipfsHash: string;
  dimensionalSignature: string;
  harmonicAlignment: number;
}

interface MusicPlayerContextType {
  currentDimensionalSignature: string | null;
  isPlaying: boolean;
  toggleDimensionalPortal: () => void;
  harmonicAlignment: number;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentDimensionalSignature, setCurrentDimensionalSignature] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [harmonicAlignment, setHarmonicAlignment] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { address } = useAccount();
  const { dimensionalState, currentDimension } = useDimensionalMusic();

  // Initialize audio element with dimensional properties
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;

      const handleError = (error: ErrorEvent) => {
        console.error('Portal audio error:', error);
        setIsPlaying(false);
      };

      const handlePlay = () => {
        setIsPlaying(true);
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      const handleEnded = async () => {
        setIsPlaying(false);
        if (audioRef.current?.src) {
          URL.revokeObjectURL(audioRef.current.src);
          audioRef.current.src = '';
        }
        // Generate dimensional proof
        if (currentDimensionalSignature) {
          try {
            const proof = await playlistManager.generateZKProof({
              signature: currentDimensionalSignature,
              dimension: currentDimension,
              harmonicAlignment
            });
            await playlistManager.submitPlaybackProof(proof);
          } catch (error) {
            console.error('Error submitting dimensional proof:', error);
          }
        }
      };

      audioRef.current.addEventListener('error', handleError);
      audioRef.current.addEventListener('play', handlePlay);
      audioRef.current.addEventListener('pause', handlePause);
      audioRef.current.addEventListener('ended', handleEnded);

      return () => {
        audioRef.current?.removeEventListener('error', handleError);
        audioRef.current?.removeEventListener('play', handlePlay);
        audioRef.current?.removeEventListener('pause', handlePause);
        audioRef.current?.removeEventListener('ended', handleEnded);

        if (audioRef.current?.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current?.pause();
      };
    }
  }, [currentDimensionalSignature, currentDimension, harmonicAlignment]);

  // Update harmonic alignment based on dimensional state
  useEffect(() => {
    if (dimensionalState) {
      setHarmonicAlignment(dimensionalState.harmonicAlignment);
      if (audioRef.current && isPlaying) {
        audioRef.current.playbackRate = dimensionalState.harmonicAlignment;
      }
    }
  }, [dimensionalState, isPlaying]);

  const toggleDimensionalPortal = async () => {
    if (!audioRef.current || !address) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Only attempt to play if we have a dimensional signature
        if (currentDimensionalSignature) {
          await audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error toggling dimensional portal:', error);
      setIsPlaying(false);
    }
  };

  return (
    <MusicPlayerContext.Provider value={{
      currentDimensionalSignature,
      isPlaying,
      toggleDimensionalPortal,
      harmonicAlignment
    }}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
}