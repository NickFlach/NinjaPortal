import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { getFromIPFS } from "@/lib/ipfs";
import { useAccount } from 'wagmi';
import { useWebSocket } from './WebSocketContext';
import { useDimensionalMusic } from './DimensionalMusicContext';
import { useDimensionalTranslation } from './LocaleContext';

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

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

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
  const audioContextRef = useRef<AudioContext>();
  const { currentDimension, dimensionalState, syncWithDimension } = useDimensionalMusic();
  const lastFetchRef = useRef<number>(0);

  // Initialize audio element
  useEffect(() => {
    try {
      if (!audioRef.current) {
        const audio = new Audio();
        audio.preload = 'auto';
        audioRef.current = audio;

        // Add error handling for audio element
        audio.addEventListener('error', (e) => {
          console.error('Audio element error:', e);
          setIsPlaying(false);
        });
      }

      // Initialize or resume AudioContext on user interaction
      const initAudioContext = () => {
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
            console.log('AudioContext initialized successfully');
          } else if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(console.error);
          }
        } catch (error) {
          console.error('Failed to initialize AudioContext:', error);
        }
      };

      document.addEventListener('click', initAudioContext, { once: true });

      return () => {
        document.removeEventListener('click', initAudioContext);
        if (audioRef.current) {
          audioRef.current.pause();
        }
      };
    } catch (error) {
      console.error('Error in audio initialization:', error);
    }
  }, []);

  // Monitor and cleanup AudioContext
  useEffect(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        console.log('AudioContext initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }

    return () => {
      try {
        audioContextRef.current?.close().catch(console.error);
      } catch (error) {
        console.error('Error closing AudioContext:', error);
      }
    };
  }, []);

  // Fetch recent songs with proper error handling and retries
  const { data: recentSongs } = useQuery<Song[]>({
    queryKey: ["/api/music/recent", landingAddress],
    queryFn: async () => {
      try {
        // Implement request debouncing
        const now = Date.now();
        if (now - lastFetchRef.current < 5000) { // 5 second debounce
          return []; // Return empty array instead of throwing
        }
        lastFetchRef.current = now;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Internal-Token': 'landing-page'
        };

        if (landingAddress) {
          headers['X-Wallet-Address'] = landingAddress;
        }

        console.log('Fetching recent songs with headers:', headers);
        const response = await fetch("/api/music/recent", { headers });

        if (!response.ok) {
          console.error('Failed to fetch recent songs:', response.statusText);
          return [];
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          console.error('Unexpected response format:', data);
          return [];
        }

        // Validate song data
        const validSongs = data.filter(song =>
          song &&
          typeof song.id === 'number' &&
          typeof song.title === 'string' &&
          typeof song.artist === 'string' &&
          typeof song.ipfsHash === 'string'
        );

        console.log('Recent songs loaded:', validSongs.length, 'songs');
        return validSongs;
      } catch (error) {
        console.error('Error fetching recent songs:', error);
        return [];
      }
    },
    refetchInterval: isLandingPage ? 30000 : false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    gcTime: 5 * 60 * 1000 // 5 minutes cache time
  });

  const fetchFromIPFS = async (hash: string, attempt = 1): Promise<ArrayBuffer> => {
    try {
      console.log('Fetching from IPFS gateway:', { hash, attempt, timestamp: new Date().toISOString() });
      const audioData = await getFromIPFS(hash);
      return audioData;
    } catch (error) {
      console.error(`IPFS fetch attempt ${attempt} failed:`, error);
      if (attempt >= MAX_RETRIES) {
        throw new Error(`Failed to fetch from IPFS after ${MAX_RETRIES} attempts`);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchFromIPFS(hash, attempt + 1);
    }
  };

  const playSong = async (song: Song, context?: PlaylistContext) => {
    try {
      // Cancel any existing fetch request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      // Update context if provided
      if (context) {
        setCurrentContext(context);
      }

      // Sync with current dimension before playing
      try {
        await syncWithDimension(currentDimension);
      } catch (error) {
        console.error('Dimensional sync error:', error);
        // Continue playback even if sync fails
      }

      // Get IPFS data with retries
      console.log('Fetching from IPFS gateway:', song.ipfsHash);
      try {
        const audioData = await fetchFromIPFS(song.ipfsHash);

        // Create blob and URL
        const blob = new Blob([audioData], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);

        // Set source and load
        if (audioRef.current) {
          const previousUrl = audioRef.current.src;
          audioRef.current.src = url;

          // Wait for audio to load
          await new Promise((resolve, reject) => {
            if (audioRef.current) {
              const onLoad = () => {
                audioRef.current?.removeEventListener('loadeddata', onLoad);
                audioRef.current?.removeEventListener('error', onError);
                resolve(undefined);
              };
              const onError = (error: Event) => {
                audioRef.current?.removeEventListener('loadeddata', onLoad);
                audioRef.current?.removeEventListener('error', onError);
                reject(new Error('Failed to load audio data'));
              };
              audioRef.current.addEventListener('loadeddata', onLoad, { once: true });
              audioRef.current.addEventListener('error', onError, { once: true });
              audioRef.current.load();
            }
          });

          // Clean up previous URL
          if (previousUrl) {
            URL.revokeObjectURL(previousUrl);
          }
        }

        // Update state
        setCurrentSong(song);

        // Apply dimensional adjustments
        if (audioRef.current && dimensionalState.harmonicAlignment !== 1) {
          audioRef.current.playbackRate = dimensionalState.harmonicAlignment;
        }

        // Try to play
        if (audioRef.current) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            try {
              await playPromise;
              setIsPlaying(true);
              console.log('IPFS fetch and playback successful');
            } catch (error) {
              console.error('Playback prevented:', error);
              setIsPlaying(false);
              throw new Error('Playback was prevented by the browser');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching from IPFS:', error);
        throw new Error('Failed to load audio from IPFS');
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
    let mounted = true;

    async function initializeMusic() {
      if (!recentSongs?.length || audioRef.current?.src || !mounted) return;

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

    return () => {
      mounted = false;
    };
  }, [recentSongs, isLandingPage]);

  // Reset context when wallet disconnects
  useEffect(() => {
    if (!userAddress) {
      setCurrentContext('landing');
    }
  }, [userAddress]);

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