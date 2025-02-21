import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { playlistManager } from "@/lib/playlist";
import { useAccount } from 'wagmi';
import { useDimensionalMusic } from './DimensionalMusicContext';

interface DimensionalTrack {
  id: number;
  ipfsHash: string;
  title: string;
  artist: string;
  dimensionalSignature?: string;
  harmonicAlignment?: number;
}

interface MusicPlayerContextType {
  currentTrack: DimensionalTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  togglePlay: () => Promise<void>;
  playTrack: (track: DimensionalTrack) => Promise<void>;
  playlist: DimensionalTrack[];
  hasInteracted: boolean;
  harmonicAlignment: number;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<DimensionalTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [harmonicAlignment, setHarmonicAlignment] = useState(1);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { address } = useAccount();
  const { dimensionalState, currentDimension, isDimensionallyAligned } = useDimensionalMusic();

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;

      const handleCanPlay = () => {
        console.log('Audio can play');
        setIsLoading(false);
        if (isPlaying) {
          audio.play().catch(error => {
            console.error('Error auto-playing after load:', error);
            setIsPlaying(false);
          });
        }
      };

      const handleError = (error: ErrorEvent) => {
        console.error('Audio error:', error);
        setIsPlaying(false);
        setIsLoading(false);
      };

      const handlePlay = () => {
        console.log('Audio playing');
        setIsPlaying(true);
      };

      const handlePause = () => {
        console.log('Audio paused');
        setIsPlaying(false);
      };

      const handleEnded = async () => {
        console.log('Audio ended');
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

      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);

        if (audio.src) {
          URL.revokeObjectURL(audio.src);
        }
        audio.pause();
      };
    }
  }, [currentTrack, currentDimension, address]);

  // Modified initialization of audio context
  const initializeAudio = async () => {
    if (!hasInteracted) {
      try {
        // Create AudioContext only on first interaction
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();

        // Ensure the context is resumed
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        setHasInteracted(true);
        console.log('Audio context initialized and resumed');
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    }
  };

  useEffect(() => {
    const handleInteraction = async () => {
      await initializeAudio();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    if (!hasInteracted) {
      window.addEventListener('click', handleInteraction);
      window.addEventListener('touchstart', handleInteraction);
    }

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [hasInteracted]);

  // Fetch current playlist
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


  // Modified playTrack function
  const playTrack = async (track: DimensionalTrack) => {
    if (!hasInteracted) {
      await initializeAudio();
    }

    if (!audioRef.current) {
      console.error('Audio element not ready');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Loading track:', track.title);

      // Stop current playback and clear src
      if (audioRef.current.src) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      setCurrentTrack(track);

      // Ensure audio context is ready
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Preload audio through IPFS
      console.log('Fetching audio data from IPFS');
      const audioData = await playlistManager.preloadAudio(track.ipfsHash);
      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      console.log('Setting audio source');
      audioRef.current.src = url;
      await audioRef.current.load();

      await audioRef.current.play();
      console.log('Track playback started');
    } catch (error) {
      console.error('Error playing track:', error);
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentTrack(null);
    }
  };

  const togglePlay = async () => {
    if (!hasInteracted) {
      console.error('User hasn\'t interacted yet');
      return;
    }

    try {
      if (!audioContextRef.current) {
        initializeAudio();
      }

      if (isPlaying && audioRef.current) {
        console.log('Pausing playback');
        audioRef.current.pause();
      } else {
        console.log('Starting playback');
        if (!currentTrack && playlist.length > 0) {
          await playTrack(playlist[0]);
        } else if (currentTrack && audioRef.current?.src) {
          if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
          }
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
      isLoading,
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