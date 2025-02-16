import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Map, BarChart2 } from "lucide-react";
import { useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAccount } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import { useIntl } from "react-intl";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

export function Navigation() {
  const [location, setLocation] = useLocation();
  const { address } = useAccount();
  const { toast } = useToast();
  const intl = useIntl();
  const { isSynced } = useMusicPlayer();

  const requestLocation = useCallback(async (e: React.MouseEvent) => {
    // Check if we already have location permission
    const hasLocationPermission = localStorage.getItem('location-permission');
    if (hasLocationPermission === 'granted') {
      return;
    }

    e.preventDefault(); // Prevent navigation until we handle location

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      // Store permission status
      localStorage.setItem('location-permission', 'granted');

      // Update user geolocation if logged in
      if (address) {
        await apiRequest("POST", "/api/users/register", {
          address,
          geolocation: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        });
      }

      // Continue with navigation
      setLocation('/map');
    } catch (error) {
      console.error('Geolocation error:', error);

      // Store denied status to avoid asking again
      localStorage.setItem('location-permission', 'denied');

      toast({
        title: intl.formatMessage({ id: 'map.location.error.title' }),
        description: intl.formatMessage({ id: 'map.location.error.description' }),
        variant: "destructive",
      });

      // Still allow navigation to map
      setLocation('/map');
    }
  }, [address, setLocation, toast, intl]);

  const links = [
    {
      href: "/map",
      label: (
        <span className="flex items-center gap-2">
          <Map className="h-4 w-4" />
        </span>
      ),
      onClick: requestLocation,
      show: location !== '/map'
    },
    {
      href: "/lumira",
      label: (
        <span className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
        </span>
      ),
      show: location !== '/lumira'
    },
    {
      href: "/whitepaper",
      label: (
        <span className="flex items-center gap-2">
          <svg 
            className="h-4 w-4 text-red-500 animate-pulse" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </span>
      ),
      show: location !== '/whitepaper'
    }
  ];

  return (
    <nav className="flex items-center gap-6 ml-8">
      {links.filter(link => link.show).map(({ href, label, onClick }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={cn(
            "text-sm transition-colors hover:text-primary",
            location === href
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          )}
        >
          {label}
        </Link>
      ))}

      {/* Pirate flag for sync status */}
      {isSynced && (
        <a
          href="https://app.pitchforks.social"
          target="_blank"
          rel="noopener noreferrer" 
          className="text-sm transition-colors hover:text-primary flex items-center gap-2"
          title="Visit Pitchforks"
        >
          <span className="text-xl animate-pulse">☠️</span>
        </a>
      )}
    </nav>
  );
}