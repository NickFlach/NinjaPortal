import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { getFromIPFS } from "@/lib/ipfs";
import { useAccount } from 'wagmi';
import type { Song } from "@/types/song";

type PlaylistContext = 'landing' | 'library' | 'feed';

interface MusicPlayerContextType {
  currentSong: Song | undefined;
  isPlaying: boolean;
  togglePlay: () => Promise<void>;
  playSong: (song: Song, context?: PlaylistContext) => Promise<void>;
  recentSongs?: Song[];
  isLandingPage: boolean;
  currentContext: PlaylistContext;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentContext, setCurrentContext] = useState<PlaylistContext>('landing');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { address: userAddress } = useAccount();
  const defaultWallet = "REDACTED_WALLET_ADDRESS";
  const landingAddress = userAddress || defaultWallet;
  const isLandingPage = !userAddress;

  // Initialize audio element safely
  useEffect(() => {
    try {
      if (!audioRef.current) {
        const audio = new Audio();
        audio.preload = 'auto';
        audioRef.current = audio;
      }

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }, []);

  // Fetch recent songs with error handling
  const { data: recentSongs } = useQuery<Song[]>({
    queryKey: ["/api/songs/recent"],
    queryFn: async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (landingAddress) {
          headers['X-Wallet-Address'] = landingAddress;
        }

        const response = await fetch("/api/songs/recent", { headers });

        if (!response.ok) {
          throw new Error(`Failed to fetch recent songs: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Recent songs loaded:', data.length, 'songs');
        return data;
      } catch (error) {
        console.error('Error fetching recent songs:', error);
        return [];
      }
    },
    refetchInterval: isLandingPage ? 30000 : false,
  });

  const playSong = async (song: Song, context?: PlaylistContext) => {
    try {
      if (!song.ipfsHash) {
        console.error('Invalid song data:', song);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (context) {
        setCurrentContext(context);
      }

      console.log('Fetching from IPFS gateway:', song.ipfsHash);
      const audioData = await getFromIPFS(song.ipfsHash);

      if (!audioData) {
        throw new Error('Failed to fetch audio data from IPFS');
      }

      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      if (!audioRef.current) {
        throw new Error('Audio element not initialized');
      }

      audioRef.current.src = url;
      await audioRef.current.load();
      setCurrentSong(song);

      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (playError) {
        console.error('Playback error:', playError);
        setIsPlaying(false);
      }

    } catch (error) {
      console.error('Error playing song:', error);
      setIsPlaying(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling play:', error);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const value: MusicPlayerContextType = {
    currentSong,
    isPlaying,
    togglePlay,
    playSong,
    recentSongs,
    isLandingPage,
    currentContext,
    audioRef
  };

  return (
    <MusicPlayerContext.Provider value={value}>
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