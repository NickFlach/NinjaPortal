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

  // Fetch song data
  const { data: songStats, isLoading } = useQuery({
    queryKey: ['/api/music/stats'],
    select: (data: any) => data
  });

  const getColor = (votes: number) => {
    if (!votes || votes === 0) return "#F5F5F5";
    const maxVotes = songStats?.totalListens || 1;
    const opacity = Math.min(0.2 + (votes / maxVotes) * 0.8, 1);
    return `rgba(52, 211, 153, ${opacity})`;
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-4xl font-bold mb-6">Global Listener Map</h1>
      <Card className="p-4">
        <div className="relative w-full h-[600px] border rounded-lg overflow-hidden">
          {tooltipContent && (
            <div className="absolute top-4 left-4 bg-white p-2 rounded-md shadow-lg z-50">
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
                  height: "100%"
                }}
              >
                <ZoomableGroup>
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const countryCode = geo.properties.iso_a3?.toLowerCase();
                        const countryVotes = songStats?.countries?.[countryCode]?.votes || 0; // Accessing votes from API response

                        const fillColor = getColor(countryVotes);

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fillColor}
                            stroke="#D6D6DA"
                            strokeWidth={0.5}
                            onMouseEnter={() => {
                              const { name } = geo.properties;
                              setTooltipContent(`${name}: ${countryVotes.toLocaleString()} plays`);
                            }}
                            onMouseLeave={() => {
                              setTooltipContent("");
                            }}
                            style={{
                              default: {
                                outline: "none",
                              },
                              hover: {
                                fill: "#93C5FD",
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