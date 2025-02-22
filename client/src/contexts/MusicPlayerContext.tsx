import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { playlistManager } from "@/lib/playlist";
import { useAccount } from 'wagmi';
import { getFileBuffer } from '@/lib/storage';

interface DimensionalTrack {
  id: number;
  ipfsHash?: string;
  neofsObjectId?: string;
  title: string;
  artist: string;
  storageType: 'ipfs' | 'neofs' | 'radio';
  streamUrl?: string;
}

interface MusicPlayerContextType {
  currentTrack: DimensionalTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  togglePlay: () => Promise<void>;
  playTrack: (track: DimensionalTrack) => Promise<void>;
  playlist: DimensionalTrack[];
  hasInteracted: boolean;
  switchToRadio: () => Promise<void>;
  isRadioMode: boolean;
  recentTracks: DimensionalTrack[];
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<DimensionalTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isRadioMode, setIsRadioMode] = useState(false);
  const [recentTracks, setRecentTracks] = useState<DimensionalTrack[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { address } = useAccount();

  // Initialize audio context
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        console.log('Audio context initialized');
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    }
  }, []);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;

      // Audio event handlers
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
      };

      // Add event listeners
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);

      return () => {
        // Clean up event listeners
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
  }, [isPlaying]);

  const playTrack = async (track: DimensionalTrack) => {
    console.log('Playing track:', track);

    if (!hasInteracted) {
      await initializeAudio();
    }

    if (!audioRef.current) {
      console.error('Audio element not ready');
      return;
    }

    try {
      setIsLoading(true);

      // Stop current playback and clear src
      if (audioRef.current.src) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      // Validate track configuration
      if (!track.storageType) {
        throw new Error('Missing storage type');
      }

      if (track.storageType === 'ipfs' && !track.ipfsHash) {
        throw new Error('Missing IPFS hash');
      }

      if (track.storageType === 'neofs' && !track.neofsObjectId) {
        throw new Error('Missing NeoFS object ID');
      }

      setCurrentTrack(track);

      // Ensure audio context is ready
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      if (track.storageType === 'radio' && track.streamUrl) {
        console.log('Playing radio stream:', track.streamUrl);
        audioRef.current.src = track.streamUrl;
        await audioRef.current.load();
      } else {
        const audioData = await getFileBuffer({
          type: track.storageType,
          hash: track.ipfsHash,
          objectId: track.neofsObjectId
        });

        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        audioRef.current.src = url;
        await audioRef.current.load();
      }

      await audioRef.current.play();
      console.log('Track playback started');
      setIsPlaying(true);

      // Add to recent tracks
      setRecentTracks(prev => {
        const newTracks = prev.filter(t => t.id !== track.id);
        return [track, ...newTracks].slice(0, 10);
      });
    } catch (error) {
      console.error('Error playing track:', error);
      setIsPlaying(false);
      setIsLoading(false);
      throw error;
    }
  };

  const initializeAudio = async () => {
    if (!hasInteracted) {
      try {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        setHasInteracted(true);
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    }
  };

  const togglePlay = async () => {
    console.log('Toggle play called, current state:', { isPlaying, hasInteracted });

    if (!hasInteracted) {
      await initializeAudio();
    }

    if (!audioRef.current) {
      console.error('Audio element not ready');
      return;
    }

    try {
      if (isPlaying) {
        console.log('Pausing playback');
        audioRef.current.pause();
        setIsPlaying(false);
      } else if (currentTrack) {
        console.log('Resuming playback');
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setIsPlaying(false);
    }
  };

  const switchToRadio = async () => {
    setIsRadioMode(true);
    console.log('Radio mode switched on');
  };

  // Fetch current playlist
  const { data: playlist = [] } = useQuery({
    queryKey: ["/api/playlists/current"],
    queryFn: async () => {
      try {
        const playlistData = await playlistManager.loadCurrentPortal();
        return playlistData.tracks.map(track => ({
          ...track,
          storageType: track.ipfsHash ? 'ipfs' : 'neofs'
        })) as DimensionalTrack[];
      } catch (error) {
        console.error('Error loading playlist:', error);
        return [];
      }
    },
    staleTime: 30000
  });

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

  return (
    <MusicPlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      isLoading,
      togglePlay,
      playTrack,
      playlist,
      hasInteracted,
      switchToRadio,
      isRadioMode,
      recentTracks
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