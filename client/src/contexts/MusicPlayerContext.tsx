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
  audioRef: React.RefObject<HTMLAudioElement>;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentContext, setCurrentContext] = useState<PlaylistContext>('landing');
  const [audioElement] = useState(() => new Audio());
  const audioRef = useRef<HTMLAudioElement>(audioElement);
  const { address: userAddress } = useAccount();
  const isLandingPage = !userAddress;
  const { dimensionalState } = useDimensionalMusic();
  const { socket } = useWebSocket();

  // Initialize audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.preload = 'auto';

    const handleError = (e: ErrorEvent) => {
      console.error('Audio element error:', e);
      setIsPlaying(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    // Add event listeners
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      // Cleanup event listeners
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);

      // Cleanup audio
      audio.pause();
      if (audio.src) {
        URL.revokeObjectURL(audio.src);
      }
    };
  }, []);

  // Fetch recent songs
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

        // Validate song data
        return data.filter(song =>
          song &&
          typeof song.id === 'number' &&
          typeof song.title === 'string' &&
          typeof song.artist === 'string' &&
          typeof song.ipfsHash === 'string'
        );
      } catch (error) {
        console.error('Error fetching recent songs:', error);
        return [];
      }
    },
    staleTime: 30000 // Consider data fresh for 30 seconds
  });

  const playSong = async (song: Song, context?: PlaylistContext) => {
    try {
      if (!audioRef.current) {
        throw new Error('Audio element not initialized');
      }

      setCurrentSong(song);
      if (context) setCurrentContext(context);

      const audioData = await getFromIPFS(song.ipfsHash);
      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }

      audioRef.current.src = url;
      await audioRef.current.load();

      if (dimensionalState.harmonicAlignment !== 1) {
        audioRef.current.playbackRate = dimensionalState.harmonicAlignment;
      }

      await audioRef.current.play();
    } catch (error) {
      console.error('Error playing song:', error);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (!currentSong && recentSongs.length > 0) {
          await playSong(recentSongs[0], currentContext);
          return;
        }
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error toggling play:', error);
      setIsPlaying(false);
    }
  };

  // Initialize landing page music
  useEffect(() => {
    if (!recentSongs.length || !audioRef.current) return;

    // Auto-play first song when on landing page and no song is currently playing
    if (!currentSong) {
      const firstSong = recentSongs[0];
      playSong(firstSong, 'landing').catch(error => {
        console.error('Error initializing music:', error);
      });
    }
  }, [recentSongs, currentSong]);

  return (
    <MusicPlayerContext.Provider value={{
      currentSong,
      isPlaying,
      togglePlay,
      playSong,
      recentSongs,
      isLandingPage,
      currentContext,
      audioRef
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