import { useAccount } from 'wagmi';
import { WalletConnect } from "@/components/WalletConnect";
import { useLocation } from 'wouter';
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from 'react';
import { OnboardingDialog } from "@/components/OnboardingDialog";

export default function Landing() {
  const { address, isConnecting, isReconnecting } = useAccount();
  const [, setLocation] = useLocation();
  const { currentSong, isPlaying, togglePlay } = useMusicPlayer();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Only check IPFS status after wallet is connected
  const { data: ipfsStatus, isLoading: isCheckingStatus } = useQuery({
    queryKey: ["/api/user/ipfs-status", address],
    queryFn: async () => {
      if (!address) return null;

      const response = await fetch("/api/user/ipfs-status", {
        headers: {
          'X-Wallet-Address': address
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user status');
      }

      return response.json();
    },
    enabled: !!address && !isConnecting && !isReconnecting,
    retry: 1
  });

  useEffect(() => {
    // Only proceed when wallet is fully connected and not in any connecting state
    if (address && !isConnecting && !isReconnecting && !isCheckingStatus) {
      console.log('Wallet connected, checking IPFS status:', { address, ipfsStatus });
      if (!ipfsStatus?.ipfsAccount) {
        setShowOnboarding(true);
      } else {
        setLocation("/home");
      }
    }
  }, [address, ipfsStatus, isCheckingStatus, isConnecting, isReconnecting, setLocation]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("/neo_token_logo_flaukowski.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(8px)',
          transform: 'scale(1.1)',
          opacity: '0.15'
        }}
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <img 
              src="/neo_token_logo_flaukowski.png" 
              alt="NEO Token"
              className="w-12 h-12"
            />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Music Portal
            </h1>
          </div>
          <WalletConnect />
        </div>

        {/* Centered Logo with Link and Music Controls */}
        <div className="flex flex-col items-center justify-center mt-24 space-y-6">
          <button 
            onClick={togglePlay}
            className="group relative transition-transform hover:scale-105 focus:outline-none rounded-lg"
          >
            <img 
              src="/neo_token_logo_flaukowski.png" 
              alt="NEO Token"
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
        </div>
      </div>

      {/* Only show onboarding when wallet is connected and IPFS is not set up */}
      {showOnboarding && address && (
        <OnboardingDialog 
          isOpen={true}
          onClose={() => {
            setShowOnboarding(false);
            setLocation("/home");
          }}
          walletAddress={address}
        />
      )}
    </div>
  );
}