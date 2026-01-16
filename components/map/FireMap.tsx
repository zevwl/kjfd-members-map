'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Member, MemberRole } from '@/types';
import { Filter, Users, X, Check, Search } from 'lucide-react';

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

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [qualFilters, setQualFilters] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Derive unique lists and counts
  const roleData = useMemo(() => {
    const roles = new Set(members.map(m => m.role));
    const counts: Record<string, number> = {};
    members.forEach(m => {
      counts[m.role] = (counts[m.role] || 0) + 1;
    });
    return {
      list: Array.from(roles).sort(),
      counts
    };
  }, [members]);

  const qualData = useMemo(() => {
    const allQuals = members.flatMap(m => m.qualifications);
    const uniqueQuals = new Set(allQuals);
    const counts: Record<string, number> = {};

    uniqueQuals.forEach(q => counts[q] = 0);

    members.forEach(m => {
      m.qualifications.forEach(q => {
        if (counts[q] !== undefined) counts[q]++;
      });
    });

    return {
      list: Array.from(uniqueQuals).sort(),
      counts
    };
  }, [members]);

  // Filter Logic
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      // 1. Search Text Filtering
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        member.firstName.toLowerCase().includes(searchLower) ||
        member.lastName.toLowerCase().includes(searchLower) ||
        member.fdIdNumber.toLowerCase().includes(searchLower) ||
        member.cellPhone.toLowerCase().includes(searchLower) ||
        member.addressLine1.toLowerCase().includes(searchLower) ||
        member.city.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // 2. Role Filtering (OR Logic)
      const matchesRole = roleFilters.length === 0 || roleFilters.includes(member.role);

      // 3. Qualification Filtering (OR Logic)
      const matchesQual = qualFilters.length === 0 ||
        (member.qualifications.length > 0 && member.qualifications.some(q => qualFilters.includes(q)));

      return matchesRole && matchesQual;
    });
  }, [members, searchTerm, roleFilters, qualFilters]);

  const toggleRoleFilter = (role: string) => {
    setRoleFilters(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const toggleQualFilter = (qual: string) => {
    setQualFilters(prev =>
      prev.includes(qual) ? prev.filter(q => q !== qual) : [...prev, qual]
    );
  };

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
      labelOrigin: new window.google.maps.Point(13, 12),
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
    <div className="relative w-full h-full group">
      {/* Map Component */}
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
        {filteredMembers.map((member) => (
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
            clickable={isLoggedIn}
          />
        ))}

        {selectedMember && (
          <InfoWindow
            position={selectedMember.location}
            onCloseClick={() => setSelectedMember(null)}
            options={{
             pixelOffset: new window.google.maps.Size(0, -25)
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

      {/* Floating UI Layer */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 items-start z-10 w-72 max-w-[calc(100vw-32px)]">

        {/* Filters Toggle & Panel */}
        {isLoggedIn && (
          <div className="flex flex-col items-start gap-2 w-full animate-in fade-in slide-in-from-left-2 duration-300">
            {!isFilterExpanded ? (
               <button
                onClick={() => setIsFilterExpanded(true)}
                className="bg-white/95 backdrop-blur shadow-md rounded-md border border-gray-200 p-2 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-2 text-sm font-medium"
               >
                 <Filter className="w-4 h-4" />
                 <span>Filters</span>
                 {(roleFilters.length > 0 || qualFilters.length > 0 || searchTerm) && (
                   <span className="flex items-center justify-center h-4 w-4 rounded-full bg-blue-500 text-[9px] text-white ml-1">
                    {roleFilters.length + qualFilters.length + (searchTerm ? 1 : 0)}
                   </span>
                 )}
               </button>
            ) : (
              <div className="bg-white/95 backdrop-blur shadow-lg rounded-lg border border-gray-200 p-4 w-full space-y-4 max-h-[60vh] overflow-y-auto">
                 <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5" /> Filter Map
                    </h4>
                    <button
                      onClick={() => setIsFilterExpanded(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                 </div>

                 {/* Active Pins Count Display */}
                 <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                    <Users className="w-3 h-3" />
                    <span className="font-medium">{filteredMembers.length} Active Pins</span>
                 </div>

                 {/* Search Bar */}
                 <div className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search name, ID, phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-sm placeholder:text-gray-400 text-gray-800"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                 </div>

                 {/* Role Filter - Multi Select */}
                 <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-gray-500">By Role</label>
                      {roleFilters.length > 0 && (
                        <button onClick={() => setRoleFilters([])} className="text-[10px] text-blue-600 hover:underline">Clear</button>
                      )}
                    </div>
                    <div className="border rounded-md border-gray-200 bg-gray-50/50 max-h-40 overflow-y-auto p-1">
                      {roleData.list.map(role => {
                        const isSelected = roleFilters.includes(role);
                        return (
                          <label key={role} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer transition-colors w-full">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isSelected}
                              onChange={() => toggleRoleFilter(role)}
                            />
                            <div className="flex-1 flex justify-between items-center text-xs text-gray-700 select-none">
                              <span className="capitalize">{role.replace(/_/g, ' ').toLowerCase()}</span>
                              <span className="text-gray-400 ml-2 bg-gray-100 px-1.5 py-0.5 rounded-full text-[10px]">{roleData.counts[role]}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                 </div>

                 {/* Qualification Filter - Multi Select */}
                 <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-gray-500">By Qualification</label>
                      {qualFilters.length > 0 && (
                        <button onClick={() => setQualFilters([])} className="text-[10px] text-blue-600 hover:underline">Clear</button>
                      )}
                    </div>
                    <div className="border rounded-md border-gray-200 bg-gray-50/50 max-h-40 overflow-y-auto p-1">
                      {qualData.list.map(q => {
                        const isSelected = qualFilters.includes(q);
                        return (
                          <label key={q} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer transition-colors w-full">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={isSelected}
                              onChange={() => toggleQualFilter(q)}
                            />
                             <div className="flex-1 flex justify-between items-center text-xs text-gray-700 select-none">
                              <span>{q}</span>
                              <span className="text-gray-400 ml-2 bg-gray-100 px-1.5 py-0.5 rounded-full text-[10px]">{qualData.counts[q]}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                 </div>

                 {/* Reset Button */}
                 {(roleFilters.length > 0 || qualFilters.length > 0 || searchTerm) && (
                   <button
                    onClick={() => { setRoleFilters([]); setQualFilters([]); setSearchTerm(''); }}
                    className="w-full text-xs text-white bg-blue-600 hover:bg-blue-700 rounded py-1.5 font-medium transition-colors"
                   >
                     Reset All Filters
                   </button>
                 )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
