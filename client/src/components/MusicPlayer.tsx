import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX, Wifi, WifiOff, Bluetooth, Skull } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useMusicSync } from "@/contexts/MusicSyncContext";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useIntl } from "react-intl";
import { motion } from "framer-motion";

export function MusicPlayer() {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    isLandingPage,
    toggleBluetoothSync,
    isBluetoothEnabled
  } = useMusicPlayer();

  const { syncEnabled, toggleSync } = useMusicSync();
  const intl = useIntl();

  // Only show mini player when not on landing page and we have a song
  if (!isLandingPage && !currentSong) return null;

  // Don't show the floating player on landing page
  if (isLandingPage) return null;

  return (
    <Card className="fixed bottom-4 right-4 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-lg w-72 z-50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{currentSong?.title}</h3>
          <p className="text-sm text-muted-foreground truncate">{currentSong?.artist}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Bluetooth Sync Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleBluetoothSync}
                  className={isBluetoothEnabled ? "text-primary" : "text-muted-foreground"}
                >
                  <motion.div 
                    className="relative"
                    animate={isBluetoothEnabled ? {
                      scale: [1, 1.2, 1],
                      rotate: [0, 15, -15, 0]
                    } : {}}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    <Bluetooth className="h-4 w-4" />
                    <motion.div
                      animate={isBluetoothEnabled ? {
                        opacity: [0.5, 1],
                        scale: [0.8, 1.2]
                      } : {}}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                    >
                      <Skull className="h-3 w-3 absolute -bottom-1 -right-1 text-primary" />
                    </motion.div>
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isBluetoothEnabled ? "Disable nearby sync" : "Enable nearby sync"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* WebSocket Sync Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleSync}
                  className={syncEnabled ? "text-primary" : "text-muted-foreground"}
                >
                  {syncEnabled ? (
                    <Wifi className="h-4 w-4" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {syncEnabled ? "Disable sync" : "Enable sync"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Play/Pause Button */}
          <Button variant="ghost" size="icon" onClick={togglePlay}>
            {isPlaying ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}