import { FC, Suspense } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "react-simple-maps";
import { Card } from "@/components/ui/card";
import { useState } from "react";

type ListenerData = {
  [key: string]: number;
};

// Sample data with correct ISO 3166-1 alpha-3 country codes
const sampleListenerData: ListenerData = {
  USA: 1000,
  GBR: 500,
  FRA: 300,
  DEU: 400,
  JPN: 600,
  CAN: 450,
  AUS: 350,
  BRA: 250,
  IND: 800,
  CHN: 900,
  RUS: 200,
  ZAF: 150,
  MEX: 300,
  ESP: 250,
  ITA: 200
};

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

const MapPage: FC = () => {
  const [tooltipContent, setTooltipContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const getColor = (listeners: number) => {
    if (listeners === 0) return "#F5F5F5";
    const opacity = Math.min(0.2 + (listeners / 1000) * 0.8, 0.9);
    return `rgba(52, 211, 153, ${opacity})`;
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="p-4 text-red-500">
          Error loading map: {error}
        </Card>
      </div>
    );
  }

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
                      const countryCode = geo.properties.ISO_A3;
                      const listeners = sampleListenerData[countryCode] || 0;
                      const fillColor = getColor(listeners);

                      // Debug log to check country codes and colors
                      console.log(`Country: ${geo.properties.NAME}, Code: ${countryCode}, Listeners: ${listeners}, Color: ${fillColor}`);

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fillColor}
                          stroke="#D6D6DA"
                          strokeWidth={0.5}
                          onMouseEnter={() => {
                            const { NAME } = geo.properties;
                            setTooltipContent(`${NAME}: ${listeners.toLocaleString()} listeners`);
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
          </Suspense>
        </div>
      </Card>
    </div>
  );
};

export default MapPage;