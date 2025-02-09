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
  audioRef: React.RefObject<HTMLAudioElement>;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentContext, setCurrentContext] = useState<PlaylistContext>('landing');
  const audioRef = useRef<HTMLAudioElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { address: userAddress } = useAccount();
  const defaultWallet = "REDACTED_WALLET_ADDRESS";
  const landingAddress = userAddress || defaultWallet;
  const isLandingPage = !userAddress;
  const audioContextRef = useRef<AudioContext>();

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Fetch landing page feed (recent songs)
  const { data: recentSongs } = useQuery<Song[]>({
    queryKey: ["/api/songs/recent"],
    queryFn: async () => {
      try {
        const headers: Record<string, string> = {
          'X-Internal-Token': 'landing-page'
        };

        if (landingAddress) {
          headers['X-Wallet-Address'] = landingAddress;
        }

        const response = await fetch("/api/songs/recent", {
          headers
        });

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

  const getNextSong = (currentSongId: number): Song | undefined => {
    if (!recentSongs?.length) return undefined;

    const currentIndex = recentSongs.findIndex(song => song.id === currentSongId);
    if (currentIndex === -1) return recentSongs[0];

    return recentSongs[(currentIndex + 1) % recentSongs.length];
  };

  // Reset to landing context when wallet disconnects
  useEffect(() => {
    if (!userAddress) {
      setCurrentContext('landing');
    }
  }, [userAddress]);

  // Initialize audio context
  useEffect(() => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContext();

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const playSong = async (song: Song, context?: PlaylistContext) => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      if (context) {
        setCurrentContext(context);
      }

      console.log('Fetching from IPFS gateway:', song.ipfsHash);
      const audioData = await getFromIPFS(song.ipfsHash);

      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      if (!audioRef.current) {
        throw new Error('Audio element not initialized');
      }

      audioRef.current.src = url;
      await new Promise<void>((resolve, reject) => {
        if (!audioRef.current) {
          reject(new Error('Audio element not initialized'));
          return;
        }
        audioRef.current.addEventListener('loadeddata', () => resolve());
        audioRef.current.addEventListener('error', (e) => reject(e));
        audioRef.current.load();
      });

      setCurrentSong(song);

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        try {
          await playPromise;
          setIsPlaying(true);
          console.log('IPFS fetch and playback successful');
        } catch (error) {
          console.error('Playback prevented:', error);
          setIsPlaying(false);
        }
      }

      try {
        await fetch(`/api/songs/play/${song.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userAddress && { 'X-Wallet-Address': userAddress })
          }
        });
      } catch (error) {
        console.error('Error recording play:', error);
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('IPFS fetch aborted');
        return;
      }
      console.error('Error playing song:', error);
      setIsPlaying(false);
      throw error;
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
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Error toggling play:', error);
      setIsPlaying(false);
    }
  };

  // Initialize music once on load - only if we're on landing page
  useEffect(() => {
    async function initializeMusic() {
      if (!recentSongs?.length || (audioRef.current && audioRef.current.src)) return;

      try {
        const firstSong = recentSongs[0];
        console.log('Initializing music with:', firstSong.title);
        await playSong(firstSong, 'landing');
      } catch (error) {
        console.error('Error initializing music:', error);
        setIsPlaying(false);
      }
    }

    if (isLandingPage) {
      initializeMusic();
    }
  }, [recentSongs, isLandingPage]);

  useEffect(() => {
    if (!audioRef.current) return;

    const handleSongEnd = async () => {
      if (!currentSong) return;

      try {
        const nextSong = getNextSong(currentSong.id);
        if (nextSong) {
          console.log('Current song ended, playing next:', nextSong.title);
          await playSong(nextSong, currentContext);
        }
      } catch (error) {
        console.error('Error auto-playing next song:', error);
        setIsPlaying(false);
      }
    };

    audioRef.current.addEventListener('ended', handleSongEnd);
    return () => {
      audioRef.current?.removeEventListener('ended', handleSongEnd);
    };
  }, [currentSong, currentContext]);

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

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        togglePlay,
        playSong,
        recentSongs,
        isLandingPage,
        currentContext,
        audioRef
      }}
    >
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