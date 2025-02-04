import { FC, Suspense } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker
} from "react-simple-maps";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";

// Define types for our map data
interface MapData {
  countries: {
    [key: string]: {
      votes: number;
      locations: Array<[number, number]>;  // [latitude, longitude] pairs
    };
  };
  totalListeners: number;
}

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

const MapPage: FC = () => {
  const [tooltipContent, setTooltipContent] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const { data: mapData, isLoading } = useQuery<MapData>({
    queryKey: ['/api/music/map'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getColor = (countryCode: string) => {
    if (!mapData?.countries) return "#1e293b"; // Base color for countries without data

    const countryData = mapData.countries[countryCode];
    if (!countryData?.votes) return "#1e293b"; // Base color for inactive countries

    // Calculate opacity based on activity level
    const maxVotes = Math.max(1, 
      Object.values(mapData.countries)
        .reduce((max, country) => Math.max(max, country.votes), 1)
    );

    // Only show green for countries with actual plays
    const opacity = Math.min(0.3 + (countryData.votes / maxVotes) * 0.7, 1);
    return `rgba(74, 222, 128, ${opacity})`; // Green-500 with variable opacity
  };

  // Helper function to format tooltip content
  const formatTooltip = (name: string, votes: number) => {
    if (votes === 0) return `${name}: No Activity`;
    if (votes === 1) return `${name}: Active Region (1 play)`;
    return `${name}: Active Region (${votes} plays)`;
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-4xl font-bold mb-6">Global Listener Map</h1>
        {mapData && (
          <div className="text-sm text-muted-foreground mb-4">
            Total Active Listeners: {mapData.totalListeners}
          </div>
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
                          const votes = mapData?.countries?.[countryCode]?.votes || 0;

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
                                setTooltipContent(formatTooltip(name, votes));
                              }}
                              onMouseLeave={() => {
                                setSelectedCountry(null);
                                setTooltipContent("");
                              }}
                              style={{
                                default: { outline: "none" },
                                hover: {
                                  fill: votes > 0 ? "#60A5FA" : "#475569",
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

                    {mapData?.countries && 
                      Object.entries(mapData.countries).map(([countryCode, data]) =>
                        data.votes > 0 && data.locations.map(([lat, lng], index) => (
                          <Marker 
                            key={`${countryCode}-${index}`} 
                            coordinates={[lng, lat]}
                          >
                            <circle
                              r={6} // Larger radius to indicate general area
                              fill={selectedCountry === countryCode ? "#60A5FA" : "#10B981"}
                              fillOpacity={0.4} // More transparent
                              stroke="#fff"
                              strokeWidth={1}
                              className="animate-pulse"
                            />
                          </Marker>
                        ))
                      )}
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