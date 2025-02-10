import { FC, useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, HeatmapLayer, Marker } from "@react-google-maps/api";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from 'wagmi';
import { Layout } from "@/components/Layout";
import { useIntl } from "react-intl";

// Define types for our map data
interface MapData {
  countries: {
    [key: string]: {
      locations: Array<[number, number]>;  // [latitude, longitude] pairs
      listenerCount: number;
      anonCount: number;    // Count of non-geotagged plays
    };
  };
  totalListeners: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

// Center coordinates to show the whole world
const defaultCenter = {
  lat: 30,
  lng: 0
};

// Default map options
const defaultMapOptions = {
  minZoom: 2, // Prevent zooming out too far
  maxZoom: 7, // Limit max zoom to maintain heatmap visibility
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  restriction: {
    latLngBounds: {
      north: 85,
      south: -85,
      west: -180,
      east: 180
    },
    strictBounds: true
  },
  styles: [
    {
      featureType: "all",
      elementType: "labels",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#193341" }]
    },
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [{ color: "#2c5a71" }]
    }
  ]
};

const MapPage: FC = () => {
  const { address } = useAccount();
  const [tooltipContent, setTooltipContent] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map>();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer>();
  const intl = useIntl();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['visualization']
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

  // Update heatmap data when map data changes
  useEffect(() => {
    if (!mapData?.countries || !mapRef.current || !heatmapRef.current) return;

    const heatmapData: google.maps.LatLng[] = [];
    const markers: google.maps.Marker[] = [];

    Object.entries(mapData.countries).forEach(([countryCode, data]) => {
      data.locations.forEach(([lat, lng]) => {
        heatmapData.push(new google.maps.LatLng(lat, lng));
      });
    });

    // Update heatmap
    heatmapRef.current.setData(heatmapData);

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = markers;

    // Create marker clusterer if we have markers
    if (markers.length > 0) {
      new MarkerClusterer({
        map: mapRef.current,
        markers,
        algorithm: new MarkerClusterer.GridAlgorithm({})
      });
    }
  }, [mapData]);

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;

    // Initialize heatmap layer with custom gradient
    heatmapRef.current = new google.maps.visualization.HeatmapLayer({
      map,
      data: [],
      options: {
        radius: 20,
        opacity: 0.7,
        gradient: [
          'rgba(0, 255, 255, 0)',
          'rgba(0, 255, 255, 1)',
          'rgba(0, 191, 255, 1)',
          'rgba(0, 127, 255, 1)',
          'rgba(0, 63, 255, 1)',
          'rgba(0, 0, 255, 1)',
          'rgba(0, 0, 223, 1)',
          'rgba(0, 0, 191, 1)',
          'rgba(0, 0, 159, 1)',
          'rgba(0, 0, 127, 1)',
          'rgba(63, 0, 91, 1)',
          'rgba(127, 0, 63, 1)',
          'rgba(191, 0, 31, 1)',
          'rgba(255, 0, 0, 1)'
        ]
      }
    });

    // Set initial bounds to show the whole world
    const worldBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(-60, -180), // Southwest corner
      new google.maps.LatLng(75, 180)    // Northeast corner
    );
    map.fitBounds(worldBounds);
  };

  const onUnmount = () => {
    mapRef.current = undefined;
    heatmapRef.current = undefined;
    markersRef.current = [];
  };

  const hasNoData = !isLoading && (!mapData || mapData.totalListeners === 0);

  if (!isLoaded) return <div>Loading Maps...</div>;

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-4xl font-bold mb-6">
          {intl.formatMessage({ id: 'map.title' })}
        </h1>

        {error ? (
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
          mapData && (
            <div className="text-sm text-muted-foreground mb-4">
              {intl.formatMessage(
                { id: 'map.totalListeners' },
                { count: mapData.totalListeners }
              )}
            </div>
          )
        )}

        <Card className="p-4 bg-background">
          <div className="relative w-full rounded-lg overflow-hidden" style={{ height: '600px' }}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={2}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={defaultMapOptions}
            >
              {/* HeatmapLayer is managed by the useEffect hook */}
            </GoogleMap>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default MapPage;