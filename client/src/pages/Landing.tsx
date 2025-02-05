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
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("/assets/branding/logo.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(8px)',
          transform: 'scale(1.1)',
          opacity: '0.15'
        }}
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Centered Logo with Link and Music Controls */}
        <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
          <button 
            onClick={togglePlay}
            className="group relative transition-transform hover:scale-105 focus:outline-none rounded-lg"
          >
            <img 
              src="/assets/branding/logo.png" 
              alt="Music Portal Logo"
              className={`w-64 h-64 object-contain ${isPlaying ? 'animate-pulse' : ''}`}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-background/80 backdrop-blur-sm p-4 rounded-full">
                {isPlaying ? (
                  <VolumeX className="h-12 w-12 text-primary" />
                ) : (
                  <Volume2 className="h-12 w-12 text-primary" />
                )}
              </div>
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