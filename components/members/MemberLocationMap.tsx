'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

interface MemberLocationMapProps {
  initialLat: number;
  initialLng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export default function MemberLocationMap({ initialLat, initialLng, onLocationChange }: MemberLocationMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script-picker',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState({ lat: initialLat, lng: initialLng });

  // Update internal state if props change (e.g. user typed new address and clicked verify)
  useEffect(() => {
    // setMarkerPosition({ lat: initialLat, lng: initialLng });
    if (map) {
      map.panTo({ lat: initialLat, lng: initialLng });
    }
  }, [initialLat, initialLng, map]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      setMarkerPosition({ lat: newLat, lng: newLng });
      onLocationChange(newLat, newLng);
    }
  };

  if (!isLoaded) {
    return (
      <div className="w-full h-75 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
        Loading Map...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={markerPosition}
      zoom={15}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        mapTypeControl: false,
        streetViewControl: false,
      }}
    >
      <Marker
        position={markerPosition}
        draggable={true}
        onDragEnd={handleDragEnd}
        title="Drag to adjust location"
      />
    </GoogleMap>
  );
}
