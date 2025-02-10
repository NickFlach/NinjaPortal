import { FC, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from 'wagmi';
import { Layout } from "@/components/Layout";
import { useIntl } from "react-intl";

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
  const heatmapLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !data.length) return;

    // Convert data to format expected by leaflet-heat
    const points = data.map(([lat, lng]) => {
      return [lat, lng, 0.5]; // intensity of 0.5 for each point
    });

    // Remove existing heatmap layer if it exists
    if (heatmapLayerRef.current) {
      map.removeLayer(heatmapLayerRef.current);
    }

    // Create new heatmap layer
    heatmapLayerRef.current = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      minOpacity: 0.3,
      gradient: {
        0.4: '#3b82f6',
        0.6: '#60a5fa',
        0.8: '#93c5fd',
        1.0: '#bfdbfe'
      }
    }).addTo(map);

    return () => {
      if (heatmapLayerRef.current) {
        map.removeLayer(heatmapLayerRef.current);
      }
    };
  }, [map, data]);

  return null;
};

const MapPage: FC = () => {
  const { address } = useAccount();
  const intl = useIntl();

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
  const heatmapData = mapData ? Object.values(mapData.countries).flatMap(
    country => country.locations
  ) : [];

  const hasNoData = !isLoading && (!mapData || mapData.totalListeners === 0);

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
          mapData && (
            <div className="text-sm text-muted-foreground mb-4">
              {intl.formatMessage(
                { id: 'map.totalListeners' },
                { count: mapData.totalListeners }
              )}
            </div>
          )
        )}

        <Card className="p-4 bg-background">
          <div className="relative w-full rounded-lg overflow-hidden" style={{ height: '600px' }}>
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
              {heatmapData.length > 0 && (
                <HeatmapLayer data={heatmapData} />
              )}
            </MapContainer>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default MapPage;