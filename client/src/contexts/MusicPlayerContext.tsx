import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from "@tanstack/react-query";
import { PlaylistItem, playlistManager } from "@/lib/playlist";
import { useAccount } from 'wagmi';

interface MusicPlayerContextType {
  currentTrack: PlaylistItem | null;
  isPlaying: boolean;
  togglePlay: () => void;
  playTrack: (track: PlaylistItem) => Promise<void>;
  playlist: PlaylistItem[];
  hasInteracted: boolean;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlaylistItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { address } = useAccount();

  // Fetch current playlist
  const { data: playlist = [] } = useQuery({
    queryKey: ["/api/playlists/current"],
    queryFn: async () => {
      try {
        const playlist = await playlistManager.loadPlaylist('current');
        return playlist.items;
      } catch (error) {
        console.error('Error loading playlist:', error);
        return [];
      }
    },
    staleTime: 30000
  });

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

      const handleEnded = async () => {
        setIsPlaying(false);
        if (audioRef.current?.src) {
          URL.revokeObjectURL(audioRef.current.src);
          audioRef.current.src = '';
        }
        // Generate and submit proof after track ends
        if (currentTrack) {
          try {
            const proof = await playlistManager.generateZKProof(currentTrack);
            await playlistManager.submitPlaybackProof(proof);
          } catch (error) {
            console.error('Error submitting playback proof:', error);
          }
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

        if (audioRef.current?.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current?.pause();
      };
    }
  }, [currentTrack]);

  const playTrack = async (track: PlaylistItem) => {
    if (!audioRef.current) return;

    try {
      setCurrentTrack(track);

      // Preload audio data
      const audioData = await playlistManager.preloadAudio(track.ipfsHash);
      const blob = new Blob([audioData], { type: 'audio/mp3' });

      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }

      const url = URL.createObjectURL(blob);
      audioRef.current.src = url;

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing track:', error);
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
        if (!currentTrack && playlist.length > 0) {
          await playTrack(playlist[0]);
        } else if (currentTrack) {
          await audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setIsPlaying(false);
    }
  };

  // Auto-play first track on landing page
  useEffect(() => {
    if (!playlist.length || !hasInteracted) return;

    if (!currentTrack && !isPlaying) {
      playTrack(playlist[0]).catch(error => {
        console.error('Error initializing playback:', error);
      });
    }
  }, [playlist, currentTrack, isPlaying, hasInteracted]);

  return (
    <MusicPlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      togglePlay,
      playTrack,
      playlist,
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