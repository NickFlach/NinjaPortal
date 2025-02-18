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
  const [audio] = useState(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    return audio;
  });

  // Authentication state
  const { address: userAddress } = useAccount();
  const isLandingPage = !userAddress;

  // Advanced features (only used when authenticated)
  const { dimensionalState } = useDimensionalMusic();
  const { socket } = useWebSocket();

  // Setup audio event listeners
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
    };

    const handlePlay = () => {
      console.log('Audio play event triggered');
      setIsPlaying(true);
      setHasInteracted(true);
    };

    const handlePause = () => {
      console.log('Audio pause event triggered');
      setIsPlaying(false);
    };

    const handleEnded = () => {
      console.log('Audio ended event triggered');
      setIsPlaying(false);
      // Reset audio source to prevent memory leaks
      if (audio.src) {
        URL.revokeObjectURL(audio.src);
        audio.src = '';
      }
    };

    // Add event listeners
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    // Enable controls
    audio.controls = true;

    // Cleanup
    return () => {
      console.log('Cleaning up audio event listeners');
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

      console.log('Starting to play song:', song.title);

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

      // Wait for audio to be loaded
      await new Promise((resolve, reject) => {
        audio.oncanplaythrough = resolve;
        audio.onerror = reject;
        audio.load();
      });

      // Apply advanced features only if authenticated
      if (userAddress && dimensionalState.harmonicAlignment !== 1) {
        audio.playbackRate = dimensionalState.harmonicAlignment;
      }

      // Play the audio
      const playPromise = audio.play();
      if (playPromise) {
        await playPromise;
        console.log('Successfully started playing:', song.title);
      }
    } catch (error) {
      console.error('Error playing song:', error);
      setIsPlaying(false);
      throw error; // Propagate error for UI handling
    }
  };

  const togglePlay = async () => {
    try {
      console.log('Toggle play called, current state:', { isPlaying, currentSong: currentSong?.title });

      if (isPlaying) {
        console.log('Pausing audio');
        audio.pause();
      } else {
        if (!currentSong && recentSongs.length > 0) {
          console.log('No current song, playing first song from recent songs');
          await playSong(recentSongs[0], currentContext);
        } else if (currentSong) {
          console.log('Resuming current song:', currentSong.title);
          await audio.play();
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setIsPlaying(false);
    }
  };

  // Auto-play for landing page with user interaction check
  useEffect(() => {
    if (!recentSongs.length || hasInteracted) return;

    const handleFirstInteraction = () => {
      if (!currentSong && isLandingPage && !hasInteracted) {
        console.log('Initializing landing page music after user interaction');
        const firstSong = recentSongs[0];
        playSong(firstSong, 'landing').catch(error => {
          console.error('Error initializing landing page music:', error);
        });
      }

      // Remove event listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    // Cleanup
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
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