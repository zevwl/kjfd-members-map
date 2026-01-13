'use client';

import React, { useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Member, MemberRole } from '../../types';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 41.340992, // Default placeholder (12 Garfield Rd)
  lng: -74.168008,
};

// Helper to determine pin color
const getPinColor = (role: MemberRole): string => {
  switch (role) {
    case MemberRole.CHIEF:
    case MemberRole.ASSISTANT_CHIEF:
    case MemberRole.DEPUTY_CHIEF:
      return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'; // White/Distinct (Using standard for now, custom SVG later)
    case MemberRole.FULL_MEMBER:
    case MemberRole.LIFE:
      return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
    case MemberRole.PROBATIONARY:
      return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    default:
      return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
  }
};

interface FireMapProps {
  members: Member[];
}

export default function FireMap({ members }: FireMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    // Fit bounds to show all members if list is not empty
    if (members.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      members.forEach((member) => {
        bounds.extend(member.location);
      });
      mapInstance.fitBounds(bounds);
    }
    setMap(mapInstance);
  }, [members]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (!isLoaded) return <div className="h-full w-full flex items-center justify-center">Loading Map...</div>;

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
      }}
    >
      {members.map((member) => (
        <Marker
          key={member.id}
          position={member.location}
          title={`${member.firstName} ${member.lastName}`}
          icon={getPinColor(member.role)}
          onClick={() => setSelectedMember(member)}
        />
      ))}

      {selectedMember && (
        <InfoWindow
          position={selectedMember.location}
          onCloseClick={() => setSelectedMember(null)}
        >
          <div className="p-2 min-w-[200px]">
            <h3 className="font-bold text-lg border-b pb-1 mb-2">
              {selectedMember.firstName} {selectedMember.lastName}
            </h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-semibold">ID:</span> {selectedMember.fdIdNumber}</p>
              <p><span className="font-semibold">Role:</span> {selectedMember.role.replace('_', ' ')}</p>
              <p><span className="font-semibold">Cell:</span> <a href={`tel:${selectedMember.cellPhone}`} className="text-blue-600 hover:underline">{selectedMember.cellPhone}</a></p>
              <p><span className="font-semibold">Address:</span> {selectedMember.addressLine1}</p>
              <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                {selectedMember.qualifications.join(', ')}
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
