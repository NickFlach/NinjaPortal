import { FC, Suspense, useEffect, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker
} from "react-simple-maps";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";

// Define types for our map data
interface MapData {
  countries: {
    [key: string]: {
      locations: Array<[number, number]>;  // [longitude, latitude] pairs
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
  const [tooltipContent, setTooltipContent] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const prevMarkersRef = useRef<MarkerData[]>([]);

  const { data: mapData, isLoading } = useQuery<MapData>({
    queryKey: ['/api/music/map'],
    refetchInterval: 15000,
  });

  // Debug logging
  useEffect(() => {
    if (mapData) {
      console.log('Map data received:', {
        countries: Object.keys(mapData.countries).length,
        totalListeners: mapData.totalListeners,
        hasLocations: Object.values(mapData.countries).some(c => c.locations.length > 0),
        firstCountryLocations: Object.values(mapData.countries)[0]?.locations
      });
    }
  }, [mapData]);

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
    if (!countryData?.locations.length) return "#1e293b"; // Base color for inactive countries
    return `rgba(74, 222, 128, 0.5)`; // Green-500 with fixed opacity for active regions
  };

  // Helper function to format tooltip content
  const formatTooltip = (name: string, locations: number = 0) => {
    if (locations === 0) return `${name}: No Activity`;
    if (locations === 1) return `${name}: 1 Active Listener`;
    return `${name}: ${locations} Active Listeners`;
  };

  const hasNoData = !isLoading && (!mapData || mapData.totalListeners === 0);

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-4xl font-bold mb-6">Global Listener Map</h1>
        {hasNoData ? (
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
                          const locations = mapData?.countries?.[countryCode]?.locations.length || 0;
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
                                setTooltipContent(formatTooltip(name, locations));
                              }}
                              onMouseLeave={() => {
                                setSelectedCountry(null);
                                setTooltipContent("");
                              }}
                              style={{
                                default: { outline: "none" },
                                hover: {
                                  fill: locations > 0 ? "#60A5FA" : "#475569",
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

                    {/* Render markers with more visibility */}
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