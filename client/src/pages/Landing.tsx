import { useAccount } from 'wagmi';
import { WalletConnect } from "@/components/WalletConnect";
import { useLocation } from 'wouter';
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { useEffect } from 'react';

export default function Landing() {
  const { address } = useAccount();
  const [, setLocation] = useLocation();
  const { currentSong, isPlaying, togglePlay } = useMusicPlayer();

  useEffect(() => {
    if (address) {
      setLocation("/home");
    }
  }, [address, setLocation]);

  // Don't redirect away from landing if already here
  if (address && window.location.pathname === '/') return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient Background */}
      <div
        className="absolute inset-0 z-0 bg-gradient-to-br from-background via-primary/5 to-purple-500/10"
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
          {/* Music Controls */}
          <button 
            onClick={togglePlay}
            className="group relative transition-transform hover:scale-105 focus:outline-none rounded-lg bg-background/80 p-8 backdrop-blur-sm"
          >
            <div className="bg-gradient-to-br from-primary to-purple-500 w-32 h-32 rounded-full flex items-center justify-center">
              {isPlaying ? (
                <VolumeX className="h-12 w-12 text-background" />
              ) : (
                <Volume2 className="h-12 w-12 text-background" />
              )}
            </div>
          </button>

          {/* Now Playing Display */}
          {currentSong ? (
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold">{currentSong.title}</h2>
              <p className="text-sm text-muted-foreground">{currentSong.artist}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading music...</span>
            </div>
          )}

          {/* Connect Wallet Button */}
          <div className="mt-8">
            <WalletConnect />
          </div>
        </div>
      </div>
    </div>
  );
}