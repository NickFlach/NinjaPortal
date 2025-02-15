import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import type { ClientInfo } from "@/types/websocket";

export interface ClientData {
  activeListeners: number;
  geotaggedListeners: number;
  anonymousListeners: number;
  listenersByCountry: Record<string, number>;
}

export function useClientData() {
  const queryClient = useQueryClient();
  const ws = useWebSocket();

  // Query for initial stats
  const { data: clientStats, isLoading, error } = useQuery<ClientData>({
    queryKey: ["/api/clients/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Listen for WebSocket updates
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'stats_update') {
          queryClient.setQueryData(["/api/clients/stats"], message.data);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, queryClient]);

  // Get geolocation and send updates
  useEffect(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    console.log('Initializing geolocation...');
    if ('geolocation' in navigator) {
      console.log('Requesting geolocation permission...');
      navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Get country code from coordinates using Cloudflare headers
            const response = await fetch(`/api/geo/lookup?lat=${latitude}&lng=${longitude}`);
            const { countryCode } = await response.json();

            ws.send(JSON.stringify({
              type: 'location_update',
              coordinates: { lat: latitude, lng: longitude },
              countryCode
            }));
          } catch (error) {
            console.error('Error updating location:', error);
          }
        },
        (error) => console.error('Geolocation error:', error),
        { enableHighAccuracy: true }
      );
    }
  }, [ws]);

  return {
    clientStats: clientStats || {
      activeListeners: 0,
      geotaggedListeners: 0,
      anonymousListeners: 0,
      listenersByCountry: {},
    },
    isLoading,
    error,
  };
}