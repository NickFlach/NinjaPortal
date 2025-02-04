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

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

const MapPage: FC = () => {
  const [tooltipContent, setTooltipContent] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const { data: songStats, isLoading } = useQuery({
    queryKey: ['/api/music/stats']
  });

  const getColor = (countryCode: string) => {
    const countryData = songStats?.countries?.[countryCode];

    // If no data exists for this country, return the base color
    if (!countryData || !countryData.votes) return "#1e293b"; // Slate-800 for base color

    const maxVotes = Math.max(1, 
      Object.values(songStats?.countries || {})
        .reduce((max, country) => Math.max(max, country.votes || 0), 1)
    );

    // Only show green for countries with actual plays
    const opacity = Math.min(0.3 + (countryData.votes / maxVotes) * 0.7, 1);
    return `rgba(74, 222, 128, ${opacity})`; // Green-500 with variable opacity
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-4xl font-bold mb-6">Global Listener Map</h1>
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
                        const countryData = songStats?.countries?.[countryCode];
                        const votes = countryData?.votes ?? 0;

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
                              setTooltipContent(
                                `${name}: ${votes > 0 ? votes.toLocaleString() + ' plays' : 'No plays'}`
                              );
                            }}
                            onMouseLeave={() => {
                              setSelectedCountry(null);
                              setTooltipContent("");
                            }}
                            style={{
                              default: { outline: "none" },
                              hover: {
                                fill: votes > 0 ? "#60A5FA" : "#475569", // Blue for active, darker for inactive
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

                  {/* Render location pins for countries with actual plays */}
                  {Object.entries(songStats?.countries || {}).map(([countryCode, data]) =>
                    data.votes > 0 && (data.locations || []).map(([lat, lng], index) => (
                      <Marker key={`${countryCode}-${index}`} coordinates={[lng, lat]}>
                        <circle
                          r={4}
                          fill={selectedCountry === countryCode ? "#60A5FA" : "#10B981"}
                          stroke="#fff"
                          strokeWidth={2}
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
  );
};

export default MapPage;