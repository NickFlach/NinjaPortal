import { FC, useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
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
import { GpsVisualizationToolkit, MarkerLayer, PathLayer, HeatmapLayer } from "@/components/GpsVisualizationToolkit";

interface MapData {
  countries: {
    [key: string]: {
      locations: Array<[number, number]>;
      listenerCount: number;
      anonCount: number;
    };
  };
  totalListeners: number;
  allLocations: Array<[number, number]>;
}

interface VisualizationOptions {
  showHeatmap: boolean;
  showMarkers: boolean;
  showPaths: boolean;
  markerSize: number;
  pathColor: string;
}

const MapPage: FC = () => {
  const { address } = useAccount();
  const { activeListeners, userCoordinates, isPlaying } = useMusicPlayer();
  const intl = useIntl();
  const [mapError, setMapError] = useState<string | null>(null);
  const [visualizationOptions, setVisualizationOptions] = useState<VisualizationOptions>({
    showHeatmap: true,
    showMarkers: false,
    showPaths: false,
    markerSize: 8,
    pathColor: "#3b82f6"
  });

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

  // Process locations for heatmap and markers
  const locationData = useMemo(() => {
    if (!mapData?.allLocations || !isPlaying) return [];
    console.log('Processing location data, total locations:', mapData.allLocations.length);
    return mapData.allLocations;
  }, [mapData, isPlaying]);

  const hasNoData = !isLoading && (!mapData || activeListeners === 0);

  // Check for leaflet.heat availability
  useEffect(() => {
    if (typeof (L as any).heatLayer !== 'function') {
      setMapError('Heatmap functionality not available');
      console.error('L.heatLayer is not defined');
    }
  }, []);

  const handleVisualizationOptionsChange = (newOptions: VisualizationOptions) => {
    console.log('Updating visualization options:', newOptions);
    setVisualizationOptions(newOptions);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-4xl font-bold mb-6">
          {intl.formatMessage({ id: 'map.title' })}
        </h1>

        {!isPlaying ? (
          <div className="text-sm text-muted-foreground mb-4">
            {intl.formatMessage({ id: 'map.noActivity' })}
          </div>
        ) : error ? (
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

                {isPlaying && (
                  <>
                    {visualizationOptions.showHeatmap && (
                      <HeatmapLayer data={locationData} />
                    )}

                    {visualizationOptions.showMarkers && (
                      <MarkerLayer 
                        data={locationData}
                        options={visualizationOptions}
                      />
                    )}

                    {visualizationOptions.showPaths && userCoordinates && (
                      <PathLayer 
                        coordinates={[userCoordinates]} 
                        options={visualizationOptions}
                      />
                    )}

                    <GpsVisualizationToolkit
                      data={locationData}
                      userPath={userCoordinates ? [userCoordinates] : undefined}
                      onOptionChange={handleVisualizationOptionsChange}
                    />
                  </>
                )}
              </MapContainer>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default MapPage;