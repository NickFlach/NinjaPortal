import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from "@tanstack/react-query";
import { getFromIPFS } from "@/lib/ipfs";
import { useAccount } from 'wagmi';
import { PIDController } from '@/lib/PIDController';
import { useWebSocket } from './WebSocketContext';

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
  isSynced: boolean;
  toggleBluetoothSync: () => Promise<void>;
  isBluetoothEnabled: boolean;
  isLeader: boolean;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentContext, setCurrentContext] = useState<PlaylistContext>('landing');
  const [userCoordinates, setUserCoordinates] = useState<Coordinates>();
  const [activeListeners, setActiveListeners] = useState(0);
  const [isSynced, setIsSynced] = useState(false);
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { address: userAddress } = useAccount();
  const defaultWallet = "REDACTED_WALLET_ADDRESS";
  const landingAddress = userAddress || defaultWallet;
  const isLandingPage = !userAddress;
  const audioContextRef = useRef<AudioContext>();
  const geolocationPermissionAsked = useRef(false);
  const [isLeader, setIsLeader] = useState(false);
  const lastSyncRef = useRef<{ timestamp: number; playing: boolean } | null>(null);
  const pidControllerRef = useRef<PIDController>(new PIDController());
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const socket = useWebSocket();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
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

        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        setUserCoordinates(coordinates);

        // Send location update if connected
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'location_update',
            coordinates,
            countryCode: 'US' // Default to US for demo
          }));
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    }
  };

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
            audioRef.current.addEventListener('loadeddata', resolve, { once: true });
            audioRef.current.addEventListener('error', reject, { once: true });
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
      // WebSocket cleanup handled by WebSocketContext
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.playbackRate = 1;
      }
    };
  }, []);


  // Enhanced WebSocket connection handling
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'stats_update':
            setActiveListeners(data.data.activeListeners);
            break;
          case 'leader_update':
            console.log('Leader status updated:', data.isLeader);
            setIsLeader(data.isLeader);
            break;
          case 'sync':
            if (!isLeader && audioRef.current && data.songId === currentSong?.id) {
              lastSyncRef.current = {
                timestamp: data.timestamp,
                playing: data.playing
              };

              const timeDiff = Math.abs(audioRef.current.currentTime - data.timestamp);
              if (timeDiff > 5) {
                audioRef.current.currentTime = data.timestamp;
                pidControllerRef.current.reset();
              }
              if (data.playing !== isPlaying) {
                await togglePlay().catch(console.error);
              }
            }
            break;
          case 'error':
            console.error('WebSocket error message:', data.message);
            break;
          default:
            console.log('Received websocket message:', data);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    socket.addEventListener('message', handleMessage);
    setIsSynced(socket.readyState === WebSocket.OPEN);

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, currentSong, isPlaying, isLeader, togglePlay]);

  // Add playback rate validation
  const adjustPlaybackSync = useCallback(() => {
    if (!audioRef.current || !currentSong || isLeader) return;

    // Get the target time from the leader's last sync message
    const targetTime = lastSyncRef.current?.timestamp || 0;
    const currentTime = audioRef.current.currentTime;

    // Compute new playback rate using PID controller
    const newRate = pidControllerRef.current.compute(targetTime, currentTime);

    // Clamp playback rate to valid range (0.25 to 4.0 for most browsers)
    const clampedRate = Math.max(0.25, Math.min(4.0, newRate));

    // Apply the computed playback rate
    if (audioRef.current) {
      try {
        audioRef.current.playbackRate = clampedRate;
      } catch (error) {
        console.warn('Failed to set playback rate:', error);
        // Reset to normal playback on error
        audioRef.current.playbackRate = 1.0;
        pidControllerRef.current.reset();
      }
    }
  }, [currentSong, isLeader]);

  const toggleBluetoothSync = useCallback(async () => {
    if (isBluetoothEnabled) {
      setIsBluetoothEnabled(false);
      return;
    }

    try {
      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });

        setUserCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });

        setIsBluetoothEnabled(true);
      }
    } catch (error) {
      console.error('Location sync error:', error);
      // Even if we get an error, we'll still enable the feature
      setIsBluetoothEnabled(true);
    }
  }, [isBluetoothEnabled]);

  const getNextSong = (currentSongId: number): Song | undefined => {
    if (!recentSongs?.length) return undefined;

    const currentIndex = recentSongs.findIndex(song => song.id === currentSongId);
    if (currentIndex === -1) return recentSongs[0];

    return recentSongs[(currentIndex + 1) % recentSongs.length];
  };

  useEffect(() => {
    if (!userAddress) {
      setCurrentContext('landing');
    }
  }, [userAddress]);

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

  useEffect(() => {
    if (socket?.readyState === WebSocket.OPEN && currentSong && isLeader) {
      try {
        socket.send(JSON.stringify({
          type: 'sync',
          songId: currentSong.id,
          playing: isPlaying,
          timestamp: audioRef.current?.currentTime || 0
        }));

        if (isPlaying && userCoordinates) {
          console.log('Sending location update:', userCoordinates);
          socket.send(JSON.stringify({
            type: 'location_update',
            coordinates: userCoordinates,
            countryCode: 'US' // Default to US for demo purposes
          }));
        }
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  }, [isPlaying, currentSong, userCoordinates, isLeader, socket]);

  useEffect(() => {
    if (!isLeader && isBluetoothEnabled) {
      // Reset PID controller when starting sync
      pidControllerRef.current.reset();

      // Start sync adjustment interval
      syncIntervalRef.current = setInterval(adjustPlaybackSync, 100); // 10Hz update rate

      // Report experience data every second
      const experienceInterval = setInterval(async () => {
        try {
          if (audioRef.current) {
            const currentTime = audioRef.current.currentTime;
            const targetTime = lastSyncRef.current?.timestamp || 0;
            const timeDiff = Math.abs(currentTime - targetTime);

            // Calculate experience metrics
            const audioQuality = Math.max(0, 1 - (timeDiff / 5)); // 0-1 scale, lower diff = better
            const syncQuality = isPlaying === (lastSyncRef.current?.playing || false) ? 1 : 0;

            await fetch('/api/lumira/experience', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'audio',
                sentiment: audioQuality * 2 - 1, // Convert to -1 to 1 scale
                intensity: syncQuality,
                context: 'sync',
                songId: currentSong?.id
              })
            });

            // Update PID parameters based on experience
            const kp = 0.5 + (audioQuality * 0.5); // Adjust proportional gain
            const ki = 0.1 + (syncQuality * 0.1); // Adjust integral gain
            pidControllerRef.current.setParameters(kp, ki, 0.01);
          }
        } catch (error) {
          console.error('Error reporting sync experience:', error);
        }
      }, 1000);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
        clearInterval(experienceInterval);
        // Reset playback rate when stopping sync
        if (audioRef.current) {
          audioRef.current.playbackRate = 1;
        }
      };
    }
  }, [isLeader, isBluetoothEnabled, currentSong, isPlaying]);

  return (
    <MusicPlayerContext.Provider value={{
      currentSong,
      isPlaying,
      togglePlay,
      playSong,
      recentSongs,
      isLandingPage,
      currentContext,
      audioRef,
      userCoordinates,
      activeListeners,
      isSynced,
      toggleBluetoothSync,
      isBluetoothEnabled,
      isLeader
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