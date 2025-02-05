import { FC, Suspense, useEffect, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker
} from "react-simple-maps";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from 'wagmi';
import { Layout } from "@/components/Layout";

// Define types for our map data
interface MapData {
  countries: {
    [key: string]: {
      locations: Array<[number, number]>;  // [longitude, latitude] pairs
      listenerCount: number;  // Add listener count
    };
  };
  totalListeners: number;
}

interface MarkerData {
  id: string;
  coordinates: [number, number];
  countryCode: string;
  isNew: boolean;
}

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

// Custom animated marker component
const AnimatedMarker: FC<{
  coordinates: [number, number];
  isSelected: boolean;
  isNew: boolean;
}> = ({ coordinates, isSelected, isNew }) => {
  console.log('Rendering marker at:', coordinates);
  return (
    <Marker coordinates={coordinates}>
      <motion.circle
        initial={{ r: 0, opacity: 0, y: -20 }}
        animate={{
          r: 6,
          opacity: 0.8,
          y: 0
        }}
        exit={{ r: 0, opacity: 0, y: 20 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
          duration: 0.5
        }}
        fill={isSelected ? "#60A5FA" : "#10B981"}
        stroke="#fff"
        strokeWidth={2}
        className="cursor-pointer hover:opacity-100"
      />
    </Marker>
  );
};

const MapPage: FC = () => {
  const { address } = useAccount();
  const [tooltipContent, setTooltipContent] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const prevMarkersRef = useRef<MarkerData[]>([]);

  const { data: mapData, isLoading, error } = useQuery<MapData>({
    queryKey: ['/api/music/map'],
    refetchInterval: 15000,
    queryFn: async () => {
      console.log('Fetching map data with auth:', {
        hasAddress: !!address,
        useInternalToken: !address
      });

      const headers: Record<string, string> = {};
      if (address) {
        headers['x-wallet-address'] = address;
      } else {
        headers['x-internal-token'] = 'landing-page';
      }

      try {
        const response = await fetch('/api/music/map', { headers });
        console.log('Map response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Map fetch failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
          throw new Error(`Failed to fetch map data: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Map data received:', {
          countryCount: Object.keys(data.countries).length,
          totalListeners: data.totalListeners,
          sampleCountry: Object.entries(data.countries)[0]
        });
        return data;
      } catch (err) {
        console.error('Map data fetch error:', err);
        throw err;
      }
    }
  });

  // Update markers when map data changes
  useEffect(() => {
    if (mapData?.countries) {
      const newMarkers: MarkerData[] = [];

      Object.entries(mapData.countries).forEach(([countryCode, data]) => {
        if (data.locations.length > 0) {
          console.log(`Processing locations for ${countryCode}:`, data.locations);
          data.locations.forEach((coordinates) => {
            const id = `${countryCode}-${coordinates[0]}-${coordinates[1]}`;
            const existingMarker = prevMarkersRef.current.find(m => m.id === id);
            newMarkers.push({
              id,
              coordinates,
              countryCode,
              isNew: !existingMarker
            });
          });
        }
      });

      console.log('Updating markers:', {
        total: newMarkers.length,
        new: newMarkers.filter(m => m.isNew).length,
        coordinates: newMarkers.map(m => m.coordinates)
      });

      setMarkers(newMarkers);
      prevMarkersRef.current = newMarkers;
    }
  }, [mapData]);

  const getColor = (countryCode: string) => {
    if (!mapData?.countries) return "#1e293b"; // Base color for countries without data
    const countryData = mapData.countries[countryCode];
    if (!countryData?.listenerCount) return "#1e293b"; // Base color for inactive countries
    return `rgba(74, 222, 128, 0.5)`; // Green-500 with fixed opacity for active regions
  };

  // Helper function to format tooltip content
  const formatTooltip = (name: string, countryCode: string) => {
    if (!mapData?.countries[countryCode]) return `${name}: No Activity`;
    const listenerCount = mapData.countries[countryCode].listenerCount;
    return `${name}: ${listenerCount} ${listenerCount === 1 ? 'Listener' : 'Listeners'}`;
  };

  const hasNoData = !isLoading && (!mapData || mapData.totalListeners === 0);

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-4xl font-bold mb-6">Global Listener Map</h1>

        {error ? (
          <div className="text-red-500 mb-4">
            Error loading map data: {(error as Error).message}
          </div>
        ) : hasNoData ? (
          <div className="text-sm text-muted-foreground mb-4">
            No listener data available yet. Play some music to see activity on the map!
          </div>
        ) : (
          mapData && (
            <div className="text-sm text-muted-foreground mb-4">
              Total Active Listeners: {mapData.totalListeners}
            </div>
          )
        )}
        <Card className="p-4 bg-background">
          <div className="relative w-full h-[600px] rounded-lg overflow-hidden">
            {tooltipContent && (
              <div className="absolute top-4 left-4 bg-background/90 p-2 rounded-md shadow-lg z-50">
                {tooltipContent}
              </div>
            )}
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center">Loading map...</div>}>
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">Loading data...</div>
              ) : (
                <ComposableMap
                  projection="geoEqualEarth"
                  projectionConfig={{
                    scale: 200,
                    center: [0, 0]
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: "transparent"
                  }}
                >
                  <ZoomableGroup>
                    <Geographies geography={geoUrl}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const countryCode = geo.properties.iso_a3;
                          const countryData = mapData?.countries?.[countryCode];
                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              fill={getColor(countryCode)}
                              stroke="#4A5568"
                              strokeWidth={0.5}
                              onMouseEnter={() => {
                                const { name } = geo.properties;
                                setSelectedCountry(countryCode);
                                setTooltipContent(formatTooltip(name, countryCode));
                              }}
                              onMouseLeave={() => {
                                setSelectedCountry(null);
                                setTooltipContent("");
                              }}
                              style={{
                                default: { outline: "none" },
                                hover: {
                                  fill: countryData?.listenerCount ? "#60A5FA" : "#475569",
                                  outline: "none",
                                  cursor: "pointer"
                                },
                                pressed: { outline: "none" },
                              }}
                            />
                          );
                        })
                      }
                    </Geographies>

                    {/* Render markers for precise locations if available */}
                    {markers.map((marker) => (
                      <AnimatedMarker
                        key={marker.id}
                        coordinates={marker.coordinates}
                        isSelected={selectedCountry === marker.countryCode}
                        isNew={marker.isNew}
                      />
                    ))}
                  </ZoomableGroup>
                </ComposableMap>
              )}
            </Suspense>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default MapPage;