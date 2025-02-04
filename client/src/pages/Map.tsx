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

// Sample data using lowercase ISO Alpha-3 codes
const sampleListenerData: ListenerData = {
  usa: 1000,
  gbr: 500,
  fra: 300,
  deu: 400,
  jpn: 600,
  can: 450,
  aus: 350,
  bra: 250,
  ind: 800,
  chn: 900,
  rus: 200,
  zaf: 150,
  mex: 300,
  esp: 250,
  ita: 200
};

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

const MapPage: FC = () => {
  const [tooltipContent, setTooltipContent] = useState("");

  const getColor = (listeners: number) => {
    if (listeners === 0) return "#F5F5F5";
    // Adjust opacity range for better visibility
    const opacity = Math.min(0.2 + (listeners / 1000) * 0.8, 1);
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
                      const listeners = sampleListenerData[countryCode] || 0;
                      const fillColor = getColor(listeners);

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fillColor}
                          stroke="#D6D6DA"
                          strokeWidth={0.5}
                          onMouseEnter={() => {
                            const { name } = geo.properties;
                            setTooltipContent(`${name}: ${listeners.toLocaleString()} listeners`);
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