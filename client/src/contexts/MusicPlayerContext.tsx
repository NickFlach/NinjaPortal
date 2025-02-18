import React, { createContext, useContext, useState, useEffect } from 'react';
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
  // Basic state management
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentContext, setCurrentContext] = useState<PlaylistContext>('landing');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [audio] = useState(() => new Audio());

  // Authentication state
  const { address: userAddress } = useAccount();
  const isLandingPage = !userAddress;

  // Advanced features (only used when authenticated)
  const { dimensionalState } = useDimensionalMusic();
  const { socket } = useWebSocket();

  // Setup audio event listeners
  useEffect(() => {
    // Basic event handlers
    const handleError = () => {
      console.error('Audio playback error');
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setHasInteracted(true);
    };

    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    // Add event listeners
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    // Cleanup
    return () => {
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);

      if (audio.src) {
        URL.revokeObjectURL(audio.src);
      }
      audio.pause();
    };
  }, [audio]);

  // Fetch recent songs - simplified for landing page
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

        // Basic validation for landing page
        return data.filter(song =>
          song &&
          typeof song.id === 'number' &&
          typeof song.title === 'string' &&
          typeof song.artist === 'string' &&
          typeof song.ipfsHash === 'string'
        ).slice(0, 5); // Limit to 5 songs for landing page
      } catch (error) {
        console.error('Error fetching recent songs:', error);
        return [];
      }
    },
    staleTime: 30000 // Consider data fresh for 30 seconds
  });

  const playSong = async (song: Song, context?: PlaylistContext) => {
    try {
      setCurrentSong(song);
      if (context) setCurrentContext(context);

      // Get audio data
      const audioData = await getFromIPFS(song.ipfsHash);
      const blob = new Blob([audioData], { type: 'audio/mp3' });

      // Clean up previous audio source
      if (audio.src) {
        URL.revokeObjectURL(audio.src);
      }

      // Set up new audio source
      const url = URL.createObjectURL(blob);
      audio.src = url;
      await audio.load();

      // Apply advanced features only if authenticated
      if (userAddress && dimensionalState.harmonicAlignment !== 1) {
        audio.playbackRate = dimensionalState.harmonicAlignment;
      }

      await audio.play();
    } catch (error) {
      console.error('Error playing song:', error);
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    try {
      if (isPlaying) {
        audio.pause();
      } else {
        if (!currentSong && recentSongs.length > 0) {
          await playSong(recentSongs[0], currentContext);
        } else if (currentSong) {
          await audio.play();
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setIsPlaying(false);
    }
  };

  // Auto-play for landing page
  useEffect(() => {
    if (!recentSongs.length || hasInteracted) return;

    if (!currentSong && isLandingPage) {
      const firstSong = recentSongs[0];
      playSong(firstSong, 'landing').catch(error => {
        console.error('Error initializing landing page music:', error);
      });
    }
  }, [recentSongs, currentSong, hasInteracted, isLandingPage]);

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