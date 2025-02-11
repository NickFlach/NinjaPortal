import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { getFromIPFS } from "@/lib/ipfs";
import { useAccount } from 'wagmi';

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

interface Coordinates {
  lat: number;
  lng: number;
}

interface MusicPlayerContextType {
  currentSong: Song | undefined;
  isPlaying: boolean;
  togglePlay: () => void;
  playSong: (song: Song, context?: PlaylistContext) => Promise<void>;
  recentSongs?: Song[];
  isLandingPage: boolean;
  currentContext: PlaylistContext;
  audioRef: React.RefObject<HTMLAudioElement>;
  userCoordinates?: Coordinates;
  activeListeners: number;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentContext, setCurrentContext] = useState<PlaylistContext>('landing');
  const [userCoordinates, setUserCoordinates] = useState<Coordinates>();
  const [activeListeners, setActiveListeners] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { address: userAddress } = useAccount();
  const defaultWallet = "REDACTED_WALLET_ADDRESS";
  const landingAddress = userAddress || defaultWallet;
  const isLandingPage = !userAddress;
  const audioContextRef = useRef<AudioContext>();
  const geolocationPermissionAsked = useRef(false);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Request geolocation when needed
  const requestGeolocation = async () => {
    if (!geolocationPermissionAsked.current && 'geolocation' in navigator) {
      geolocationPermissionAsked.current = true;
      console.log('Requesting geolocation permission...');
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });

        console.log('Geolocation obtained:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });

        setUserCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      } catch (error) {
        console.error('Error getting location:', error);
      }
    }
  };

  // Initialize geolocation on component mount
  useEffect(() => {
    console.log('Initializing geolocation...');
    requestGeolocation();
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

  // Function to get next song in the current context
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
      // Request geolocation if not already asked
      await requestGeolocation();

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

      // Get IPFS data
      console.log('Fetching from IPFS gateway:', song.ipfsHash);
      const audioData = await getFromIPFS(song.ipfsHash);

      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      // Set source and load
      if (audioRef.current) {
        audioRef.current.src = url;
        await new Promise((resolve, reject) => {
          if (audioRef.current) {
            audioRef.current.addEventListener('loadeddata', resolve);
            audioRef.current.addEventListener('error', reject);
            audioRef.current.load();
          }
        });
      }

      // Update refs and state
      setCurrentSong(song);

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
          }
        }
      }

      // Record play with location
      try {
        await fetch(`/api/songs/play/${song.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userAddress && { 'X-Wallet-Address': userAddress })
          },
          body: JSON.stringify(userCoordinates ? {
            latitude: userCoordinates.lat,
            longitude: userCoordinates.lng
          } : {})
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

  // Simple volume toggle for landing page
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
      if (!recentSongs?.length || audioRef.current?.src) return;

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

  // Add event listener for song end
  useEffect(() => {
    if (!audioRef.current) return;

    const handleSongEnd = async () => {
      if (!currentSong) return;

      try {
        // Get the next song in the current context
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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/music-sync`;

    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        if (userAddress) {
          ws.send(JSON.stringify({ type: 'auth', address: userAddress }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'stats_update') {
            setActiveListeners(data.data.activeListeners);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Reset active listeners when disconnected
        setActiveListeners(0);
        // Attempt to reconnect after a delay
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [userAddress]);

  // Update the WebSocket effect to handle playback status
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && currentSong) {
      // Send playback status
      wsRef.current.send(JSON.stringify({
        type: 'sync',
        songId: currentSong.id,
        playing: isPlaying,
        timestamp: audioRef.current?.currentTime || 0
      }));

      // Only send location updates if music is playing and we have coordinates
      if (isPlaying && userCoordinates) {
        console.log('Sending location update:', userCoordinates);
        wsRef.current.send(JSON.stringify({
          type: 'location_update',
          coordinates: userCoordinates,
          countryCode: 'US' // Default to US for demo purposes
        }));
      }
    }
  }, [isPlaying, currentSong, userCoordinates]);


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
        audioRef,
        userCoordinates,
        activeListeners
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