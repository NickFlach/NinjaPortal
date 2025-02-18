import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { playlistManager } from "@/lib/playlist";
import { useAccount } from 'wagmi';
import { useDimensionalMusic } from './DimensionalMusicContext';

interface DimensionalTrack {
  id: number;
  ipfsHash: string;
  dimensionalSignature?: string;
  harmonicAlignment?: number;
}

interface MusicPlayerContextType {
  currentTrack: DimensionalTrack | null;
  isPlaying: boolean;
  togglePlay: () => void;
  playTrack: (track: DimensionalTrack) => Promise<void>;
  playlist: DimensionalTrack[];
  hasInteracted: boolean;
  harmonicAlignment: number;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<DimensionalTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [harmonicAlignment, setHarmonicAlignment] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { address } = useAccount();
  const { dimensionalState, currentDimension, isDimensionallyAligned } = useDimensionalMusic();

  // Fetch current playlist with dimensional enhancement
  const { data: playlist = [] } = useQuery({
    queryKey: ["/api/playlists/current"],
    queryFn: async () => {
      try {
        const playlist = await playlistManager.loadCurrentPortal();
        return playlist.tracks;
      } catch (error) {
        console.error('Error loading dimensional portal:', error);
        return [];
      }
    },
    staleTime: 30000,
    enabled: isDimensionallyAligned
  });

  // Initialize audio element
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
        setHasInteracted(true);
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

        // Generate dimensional proof if track has dimensional signature
        if (currentTrack?.dimensionalSignature) {
          try {
            const proof = await playlistManager.generateZKProof({
              signature: currentTrack.dimensionalSignature,
              dimension: currentDimension,
              harmonicAlignment: currentTrack.harmonicAlignment || 1,
              timestamp: Date.now(),
              address
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
  }, [currentTrack, currentDimension, address]);

  // Update harmonic alignment based on dimensional state
  useEffect(() => {
    if (dimensionalState && currentTrack?.dimensionalSignature) {
      setHarmonicAlignment(dimensionalState.harmonicAlignment);
      if (audioRef.current && isPlaying) {
        audioRef.current.playbackRate = dimensionalState.harmonicAlignment;
      }
    }
  }, [dimensionalState, isPlaying, currentTrack]);

  const playTrack = async (track: DimensionalTrack) => {
    if (!audioRef.current || !address) return;

    try {
      setCurrentTrack(track);

      // Preload audio through IPFS
      const audioData = await playlistManager.preloadAudio(track.ipfsHash);
      const blob = new Blob([audioData], { type: 'audio/mp3' });

      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }

      const url = URL.createObjectURL(blob);
      audioRef.current.src = url;
      await audioRef.current.play();
    } catch (error) {
      console.error('Error playing track:', error);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current || !address) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (!currentTrack && playlist.length > 0) {
          await playTrack(playlist[0]);
        } else if (currentTrack) {
          await audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setIsPlaying(false);
    }
  };

  return (
    <MusicPlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      togglePlay,
      playTrack,
      playlist,
      hasInteracted,
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