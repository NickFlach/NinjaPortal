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
          Map
        </span>
      ),
      onClick: requestLocation,
      show: location !== '/map'
    },
    {
      href: "/lumira",
      label: (
        <span className="flex items-center">
          <BarChart2 className="h-4 w-4" />
        </span>
      ),
      show: true
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