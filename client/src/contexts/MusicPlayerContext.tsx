import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const { address: userAddress } = useAccount();
  const defaultWallet = "REDACTED_WALLET_ADDRESS";
  const landingAddress = userAddress || defaultWallet;
  const isLandingPage = !userAddress;
  const audioContextRef = useRef<AudioContext>();
  const { currentDimension, dimensionalState } = useDimensionalMusic();
  const { socket } = useWebSocket();
  const songsInitializedRef = useRef(false);
  const queryClient = useQueryClient();

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audioRef.current = audio;

        console.log('Audio element initialized');

        // Add audio event listeners
        audio.addEventListener('error', (e) => {
          console.error('Audio element error:', e);
          setIsPlaying(false);
        });

        audio.addEventListener('play', () => {
          console.log('Audio started playing');
          setIsPlaying(true);
        });

        audio.addEventListener('pause', () => {
          console.log('Audio paused');
          setIsPlaying(false);
        });

        audio.addEventListener('ended', () => {
          console.log('Audio playback ended');
          setIsPlaying(false);
        });

        // Initialize AudioContext
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
          console.log('AudioContext initialized successfully');
        }
      } catch (error) {
        console.error('Error in audio initialization:', error);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  // Fetch recent songs only once initially
  const { data: recentSongs } = useQuery<Song[]>({
    queryKey: ["/api/music/recent", landingAddress],
    queryFn: async () => {
      try {
        // Only fetch if we haven't initialized songs yet
        if (songsInitializedRef.current) {
          console.log('Songs already initialized, using cached data');
          const cachedData = queryClient.getQueryData<Song[]>(["/api/music/recent", landingAddress]);
          return cachedData || [];
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Internal-Token': 'landing-page'
        };

        if (landingAddress) {
          headers['X-Wallet-Address'] = landingAddress;
        }

        console.log('Fetching initial songs with headers:', headers);
        const response = await fetch("/api/music/recent", { headers });

        if (!response.ok) {
          throw new Error(`Failed to fetch recent songs: ${response.statusText}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Unexpected response format');
        }

        // Validate song data
        const validSongs = data.filter(song =>
          song &&
          typeof song.id === 'number' &&
          typeof song.title === 'string' &&
          typeof song.artist === 'string' &&
          typeof song.ipfsHash === 'string'
        );

        console.log('Initial songs loaded:', validSongs.length, 'songs');
        songsInitializedRef.current = true;
        return validSongs;
      } catch (error) {
        console.error('Error fetching recent songs:', error);
        return [];
      }
    },
    enabled: !songsInitializedRef.current,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    staleTime: Infinity,
    cacheTime: Infinity
  });

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!socket) {
      console.log('WebSocket not available, skipping subscription');
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'songUpdate') {
          console.log('Received song update via WebSocket:', data);
          // Update cache with new song data
          queryClient.setQueryData<Song[]>(["/api/music/recent", landingAddress], (oldData = []) => {
            if (data.action === 'add') {
              return [data.song, ...oldData];
            }
            return oldData;
          });
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    console.log('Setting up WebSocket message listener');
    socket.addEventListener('message', handleMessage);

    return () => {
      console.log('Cleaning up WebSocket message listener');
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, landingAddress, queryClient]);

  const playSong = async (song: Song, context?: PlaylistContext) => {
    try {
      console.log('Starting to play song:', song.title);

      // Update state first to show UI changes
      setCurrentSong(song);
      if (context) setCurrentContext(context);

      if (!audioRef.current) {
        throw new Error('Audio element not initialized');
      }

      // Get IPFS data
      const audioData = await getFromIPFS(song.ipfsHash);
      console.log('Successfully fetched audio data');

      // Create blob and URL
      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      // Cleanup previous URL if exists
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }

      // Set new source
      audioRef.current.src = url;
      await audioRef.current.load();

      // Apply dimensional adjustments if needed
      if (dimensionalState.harmonicAlignment !== 1) {
        audioRef.current.playbackRate = dimensionalState.harmonicAlignment;
      }

      // Play
      console.log('Attempting to play audio');
      await audioRef.current.play();
      console.log('Playback started successfully');
    } catch (error) {
      console.error('Error playing song:', error);
      setIsPlaying(false);
      throw error;
    }
  };

  const togglePlay = async () => {
    console.log('Toggle play called, current state:', { isPlaying, currentSong: currentSong?.title });

    if (!audioRef.current) {
      console.log('No audio element available');
      return;
    }

    try {
      if (isPlaying) {
        console.log('Pausing playback');
        audioRef.current.pause();
      } else {
        if (!currentSong && recentSongs?.length) {
          console.log('No current song, playing first song from recent songs');
          await playSong(recentSongs[0], currentContext);
          return;
        }

        console.log('Resuming playback');
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error toggling play:', error);
      setIsPlaying(false);
    }
  };

  // Initialize landing page music
  useEffect(() => {
    let mounted = true;

    async function initializeMusic() {
      if (!recentSongs?.length || !mounted || !audioRef.current) {
        console.log('Skipping music initialization:', {
          hasRecentSongs: !!recentSongs?.length,
          mounted,
          hasAudioRef: !!audioRef.current
        });
        return;
      }

      try {
        const firstSong = recentSongs[0];
        console.log('Initializing landing page music with:', firstSong.title);

        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        await playSong(firstSong, 'landing');
      } catch (error) {
        console.error('Error initializing landing page music:', error);
        setIsPlaying(false);
      }
    }

    if (isLandingPage) {
      console.log('On landing page, initializing music');
      initializeMusic();
    }

    return () => {
      mounted = false;
    };
  }, [recentSongs, isLandingPage]);

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