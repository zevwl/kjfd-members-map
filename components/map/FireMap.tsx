'use client';

import React, { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Member, MemberRole } from '@/types';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 41.340992,
  lng: -74.168008,
};

// SVG Path for a Fire Helmet (Side Profile View) with a pointer at the bottom
// Added a triangle (L10,17 L12,22 L14,17) to create a visual tip pointing to the map location
const HELMET_SVG_PATH = "M22,15 L21,15 L21,10 C19.5,7.5 17,6 14,6 C9,6 5,10 5,15 L1,15 L1,17 L10,17 L12,22 L14,17 L22,17 Z";

interface FireMapProps {
  members: Member[];
  isLoggedIn?: boolean;
}

export default function FireMap({ members, isLoggedIn = false }: FireMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
  });

  const [, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    // Auto-fit bounds logic removed to keep default center
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Defined inside component to access window.google safely after load
  const getPinIcon = useCallback((role: MemberRole): google.maps.Symbol | undefined => {
    // Safety check to prevent errors during SSR or before load
    if (typeof window === 'undefined' || !window.google) return undefined;

    let fillColor = '#ef4444'; // default red-500
    const strokeColor = '#000000'; // Black outline for contrast

    switch (role) {
      case MemberRole.CHIEF:
      case MemberRole.ASSISTANT_CHIEF:
      case MemberRole.DEPUTY_CHIEF:
        fillColor = '#FFFFFF'; // White
        break;
      case MemberRole.FULL_MEMBER:
      case MemberRole.LIFE:
        fillColor = '#FFD700'; // Gold/Yellow
        break;
      case MemberRole.PROBATIONARY:
        fillColor = '#60A5FA'; // Blue
        break;
      default:
        fillColor = '#ef4444';
    }

    return {
      path: HELMET_SVG_PATH,
      fillColor: fillColor,
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: strokeColor,
      scale: 1.5,
      // Anchor the pin at the tip of the pointer (x=12, y=22) to ensure accuracy
      anchor: new window.google.maps.Point(12, 22),
      // Position label text in the visual center of the helmet dome
      labelOrigin: new window.google.maps.Point(12, 12),
    };
  }, []);

  const handleMarkerClick = (member: Member) => {
    if (isLoggedIn) {
      setSelectedMember(member);
    }
  };

  const truncateByDecimalPlace = (value: number, numDecimalPlaces: number) =>
  Math.trunc(value * Math.pow(10, numDecimalPlaces)) / Math.pow(10, numDecimalPlaces);

  const truncateBy3DecimalPlaces = (value: number) => truncateByDecimalPlace(value, 3);


  const getMemberLocation = (location: { lat: number; lng: number }): google.maps.LatLngLiteral => {
    if (isLoggedIn){
      return { lat: location.lat, lng: location.lng };
    } else {
      return { lat: truncateBy3DecimalPlaces(location.lat), lng: truncateBy3DecimalPlaces(location.lng) };
    }
  }

  if (!isLoaded) return <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-500">Loading Map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={13}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      }}
    >
      {members.map((member) => (
        <Marker
          key={member.id}
          position={getMemberLocation(member.location)}
          title={`${member.firstName} ${member.lastName}`}
          icon={getPinIcon(member.role)}
          label={isLoggedIn ? {
            text: member.fdIdNumber,
            color: '#000000',
            fontSize: '9px',
            fontWeight: 'bold',
          } : undefined}
          onClick={() => handleMarkerClick(member)}
          // Set clickable to false visually for users who can't interact, though onClick guard handles logic
          clickable={isLoggedIn}
        />
      ))}

      {selectedMember && (
        <InfoWindow
          position={selectedMember.location}
          onCloseClick={() => setSelectedMember(null)}
          options={{
             pixelOffset: new window.google.maps.Size(0, -25) // Adjusted offset for the new pointer
          }}
        >
          <div className="p-1 min-w-50">
            <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">
              {selectedMember.firstName} {selectedMember.lastName}
            </h3>
            <div className="space-y-1.5 text-sm text-gray-600">
              <p><span className="font-semibold text-gray-800">ID:</span> {selectedMember.fdIdNumber}</p>
              <p>
                <span className="font-semibold text-gray-800">Role:</span>
                <span className="ml-1 inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                  {selectedMember.role.replace(/_/g, ' ').toLowerCase()}
                </span>
              </p>
              <p><span className="font-semibold text-gray-800">Cell:</span> <a href={`tel:${selectedMember.cellPhone}`} className="text-brand-red hover:underline">{selectedMember.cellPhone}</a></p>
              <p className="text-xs text-gray-500 pt-1">{selectedMember.addressLine1}</p>

              {selectedMember.qualifications.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                  {selectedMember.qualifications.map((q, idx) => (
                    <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                      {q}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
