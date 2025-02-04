import { FC, Suspense } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "react-simple-maps";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

const MapPage: FC = () => {
  const [tooltipContent, setTooltipContent] = useState("");

  // Fetch song data with logging
  const { data: songStats, isLoading } = useQuery({
    queryKey: ['/api/music/stats'],
    select: (data: any) => {
      console.log('Raw music stats response:', data);
      console.log('Country data from response:', data?.countries);
      return data;
    }
  });

  const getColor = (votes: number) => {
    // Use a darker base color for countries with no plays
    if (!votes || votes === 0) return "#2A303C";

    const maxVotes = Math.max(1, songStats?.totalListens || 1);
    // Adjust opacity range to be more visible
    const opacity = Math.min(0.3 + (votes / maxVotes) * 0.7, 1);
    // Use a brighter green for better visibility
    return `rgba(74, 222, 128, ${opacity})`;
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
                        const votes = songStats?.countries?.[countryCode]?.votes || 0;
                        console.log(`Rendering country: ${countryCode}, votes: ${votes}`, {
                          hasData: countryCode in (songStats?.countries || {}),
                          rawVotes: songStats?.countries?.[countryCode]?.votes
                        });

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={getColor(votes)}
                            stroke="#4A5568"
                            strokeWidth={0.5}
                            onMouseEnter={() => {
                              const { name } = geo.properties;
                              setTooltipContent(`${name}: ${votes.toLocaleString()} plays`);
                            }}
                            onMouseLeave={() => {
                              setTooltipContent("");
                            }}
                            style={{
                              default: {
                                outline: "none",
                              },
                              hover: {
                                fill: "#60A5FA",
                                outline: "none",
                                cursor: "pointer"
                              },
                              pressed: {
                                outline: "none",
                              },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
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