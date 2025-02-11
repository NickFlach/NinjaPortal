import { FC, useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from 'wagmi';
import { Layout } from "@/components/Layout";
import { useIntl } from "react-intl";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

// Define types for our map data
interface MapData {
  countries: {
    [key: string]: {
      locations: Array<[number, number]>;  // [latitude, longitude] pairs
      listenerCount: number;
      anonCount: number;    // Count of non-geotagged plays
    };
  };
  totalListeners: number;
}

// HeatmapLayer component
const HeatmapLayer: FC<{ data: Array<[number, number]> }> = ({ data }) => {
  const map = useMap();
  const heatmapLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map || !data.length) {
      if (heatmapLayerRef.current) {
        map.removeLayer(heatmapLayerRef.current);
        heatmapLayerRef.current = null;
      }
      return;
    }

    console.log('Creating heatmap with data points:', data.length);

    try {
      // Remove existing layer
      if (heatmapLayerRef.current) {
        map.removeLayer(heatmapLayerRef.current);
      }

      // Convert coordinates to heatmap points with intensity
      const points = data.map(([lat, lng]) => {
        return [lat, lng, 0.8] as [number, number, number]; // Increased intensity
      });

      // Create new heatmap layer with adjusted options
      const heatLayer = (L as any).heatLayer(points, {
        radius: 35,          // Increased radius
        blur: 20,           // Increased blur
        maxZoom: 10,
        minOpacity: 0.4,    // Increased minimum opacity
        maxOpacity: 1,      // Added maximum opacity
        gradient: {         // Enhanced gradient
          0.2: '#3b82f6',  // Start with blue
          0.4: '#60a5fa',
          0.6: '#93c5fd',
          0.8: '#bfdbfe',
          1.0: '#ffffff'   // End with white for intensity
        }
      });

      // Add layer to map
      heatLayer.addTo(map);
      heatmapLayerRef.current = heatLayer;

      console.log('Heatmap layer created and added to map');
    } catch (error) {
      console.error('Error creating/updating heatmap layer:', error);
    }

    // Cleanup function
    return () => {
      if (heatmapLayerRef.current) {
        try {
          map.removeLayer(heatmapLayerRef.current);
          heatmapLayerRef.current = null;
        } catch (error) {
          console.error('Error cleaning up heatmap layer:', error);
        }
      }
    };
  }, [map, data]); // Only re-run if map or data changes

  return null;
};

const MapPage: FC = () => {
  const { address } = useAccount();
  const { activeListeners } = useMusicPlayer();
  const intl = useIntl();
  const [mapError, setMapError] = useState<string | null>(null);

  const { data: mapData, isLoading, error } = useQuery<MapData>({
    queryKey: ['/api/music/map'],
    refetchInterval: 15000,
    queryFn: async () => {
      const headers: Record<string, string> = address
        ? { 'x-wallet-address': address }
        : { 'x-internal-token': 'landing-page' };

      const response = await fetch('/api/music/map', { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch map data: ${response.statusText}`);
      }

      return response.json();
    }
  });

  // Process locations for heatmap
  const heatmapData = useMemo(() => {
    if (!mapData) return [];

    // Collect all locations from all countries
    const allLocations = Object.values(mapData.countries).flatMap(
      country => country.locations
    );

    console.log('Processing heatmap data, total locations:', allLocations.length);
    return allLocations;
  }, [mapData]);

  const hasNoData = !isLoading && (!mapData || activeListeners === 0);

  // Check for leaflet.heat availability
  useEffect(() => {
    if (typeof (L as any).heatLayer !== 'function') {
      setMapError('Heatmap functionality not available');
      console.error('L.heatLayer is not defined');
    }
  }, []);

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-4xl font-bold mb-6">
          {intl.formatMessage({ id: 'map.title' })}
        </h1>

        {error ? (
          <div className="text-red-500 mb-4">
            {intl.formatMessage(
              { id: 'map.error' },
              { error: (error as Error).message }
            )}
          </div>
        ) : hasNoData ? (
          <div className="text-sm text-muted-foreground mb-4">
            {intl.formatMessage({ id: 'map.noData' })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground mb-4">
            {intl.formatMessage(
              { id: 'map.totalListeners' },
              { count: activeListeners }
            )}
          </div>
        )}

        <Card className="p-4 bg-background">
          <div className="relative w-full rounded-lg overflow-hidden" style={{ height: '600px' }}>
            {mapError ? (
              <div className="absolute inset-0 flex items-center justify-center text-red-500">
                {mapError}
              </div>
            ) : (
              <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: '100%', width: '100%' }}
                minZoom={2}
                maxZoom={7}
                maxBounds={[[-90, -180], [90, 180]]}
                className="z-0"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  className="dark-tiles"
                />
                <HeatmapLayer data={heatmapData} />
              </MapContainer>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default MapPage;