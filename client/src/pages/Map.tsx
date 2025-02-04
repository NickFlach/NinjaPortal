import { FC } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "react-simple-maps";
import { Card } from "@/components/ui/card";

type ListenerData = {
  [key: string]: number;
};

// Sample data - in production this would come from your backend
const sampleListenerData: ListenerData = {
  USA: 1000,
  GBR: 500,
  FRA: 300,
  DEU: 400,
  JPN: 600,
  // Add more countries as needed
};

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

const MapPage: FC = () => {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-4xl font-bold mb-6">Global Listener Map</h1>
      <Card className="p-4">
        <div style={{ width: "100%", height: "500px" }}>
          <ComposableMap>
            <ZoomableGroup>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const countryCode = geo.properties.ISO_A3 as string;
                    const listeners = sampleListenerData[countryCode] || 0;
                    const fillColor = listeners > 0 
                      ? `rgba(52, 211, 153, ${Math.min(listeners / 1000, 0.8)})`
                      : "#F5F5F5";

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fillColor}
                        stroke="#D6D6DA"
                        style={{
                          default: {
                            outline: "none",
                          },
                          hover: {
                            fill: "#93C5FD",
                            outline: "none",
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
        </div>
      </Card>
    </div>
  );
};

export default MapPage;