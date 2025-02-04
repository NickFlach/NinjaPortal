import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useMusicSync } from "@/contexts/MusicSyncContext";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function MusicPlayer() {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    isLandingPage
  } = useMusicPlayer();

  const { syncEnabled, toggleSync } = useMusicSync();

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