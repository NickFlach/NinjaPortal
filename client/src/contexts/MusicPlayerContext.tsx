import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { getFromIPFS } from "@/lib/ipfs";
import { useAccount } from 'wagmi';
import { useWebSocket } from './WebSocketContext';
import { useDimensionalMusic } from './DimensionalMusicContext';

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
}

type PlaylistContext = 'landing' | 'library' | 'feed';

interface MusicPlayerContextType {
  currentSong: Song | undefined;
  isPlaying: boolean;
  togglePlay: () => void;
  playSong: (song: Song, context?: PlaylistContext) => Promise<void>;
  recentSongs: Song[];
  isLandingPage: boolean;
  currentContext: PlaylistContext;
  hasInteracted: boolean;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentContext, setCurrentContext] = useState<PlaylistContext>('landing');
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { address: userAddress } = useAccount();
  const isLandingPage = !userAddress;
  const { dimensionalState } = useDimensionalMusic();
  const { socket } = useWebSocket();

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;

      const handleError = (error: ErrorEvent) => {
        console.error('Audio playback error:', error);
        setIsPlaying(false);
      };

      const handlePlay = () => {
        setIsPlaying(true);
        setHasInteracted(true);
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        if (audioRef.current && audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
          audioRef.current.src = '';
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

        if (audioRef.current && audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current?.pause();
      };
    }
  }, []);

  const { data: recentSongs = [] } = useQuery<Song[]>({
    queryKey: ["/api/music/recent"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/music/recent");
        if (!response.ok) {
          throw new Error(`Failed to fetch recent songs: ${response.statusText}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Unexpected response format');
        }

        return data.filter(song =>
          song &&
          typeof song.id === 'number' &&
          typeof song.title === 'string' &&
          typeof song.artist === 'string' &&
          typeof song.ipfsHash === 'string'
        ).slice(0, 5);
      } catch (error) {
        console.error('Error fetching recent songs:', error);
        return [];
      }
    },
    staleTime: 30000
  });

  const playSong = async (song: Song, context?: PlaylistContext) => {
    if (!audioRef.current) return;

    try {
      setCurrentSong(song);
      if (context) setCurrentContext(context);

      const audioData = await getFromIPFS(song.ipfsHash);
      const blob = new Blob([audioData], { type: 'audio/mp3' });

      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }

      const url = URL.createObjectURL(blob);
      audioRef.current.src = url;

      await new Promise((resolve) => {
        if (audioRef.current) {
          audioRef.current.oncanplaythrough = resolve;
          audioRef.current.load();
        }
      });

      if (userAddress && dimensionalState.harmonicAlignment !== 1) {
        audioRef.current.playbackRate = dimensionalState.harmonicAlignment;
      }

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing song:', error);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (!hasInteracted) {
      setHasInteracted(true);
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (!currentSong && recentSongs.length > 0) {
          await playSong(recentSongs[0], currentContext);
        } else if (currentSong) {
          await audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (!recentSongs.length || !isLandingPage) return;

    const handleFirstInteraction = () => {
      setHasInteracted(true);
      if (!currentSong && !isPlaying && recentSongs.length > 0) {
        playSong(recentSongs[0], 'landing').catch(error => {
          console.error('Error initializing landing page music:', error);
        });
      }
    };

    document.body.addEventListener('click', handleFirstInteraction, { once: true });
    document.body.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      document.body.removeEventListener('click', handleFirstInteraction);
      document.body.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [recentSongs, currentSong, isPlaying, isLandingPage]);

  return (
    <MusicPlayerContext.Provider value={{
      currentSong,
      isPlaying,
      togglePlay,
      playSong,
      recentSongs,
      isLandingPage,
      currentContext,
      hasInteracted
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