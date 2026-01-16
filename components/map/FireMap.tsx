'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { Member, MemberRole } from '@/types';
import { Filter, Users, X, Check, Search, Car, Footprints, Loader2, Siren } from 'lucide-react';

// Libraries must be defined outside the component to prevent infinite reloading
const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 41.340992,
  lng: -74.168008,
};

const HELMET_SVG_PATH = "M22,15 L21,15 L21,10 C19.5,7.5 17,6 14,6 C9,6 5,10 5,15 L1,15 L1,17 L10,17 L12,22 L14,17 L22,17 Z";

interface FireMapProps {
  members: Member[];
  isLoggedIn?: boolean;
}

interface ClosestMemberResult {
  member: Member;
  driving: { distance: string; duration: string; durationValue: number };
  walking: { distance: string; duration: string };
}

export default function FireMap({ members, isLoggedIn = false }: FireMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [qualFilters, setQualFilters] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Dispatch / Closest Member States
  const [isDispatchExpanded, setIsDispatchExpanded] = useState(false);
  const [incidentAddress, setIncidentAddress] = useState('');
  const [targetLocation, setTargetLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [closestMembers, setClosestMembers] = useState<ClosestMemberResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Derive unique lists and counts (Same as before)
  const roleData = useMemo(() => {
    const roles = new Set(members.map(m => m.role));
    const counts: Record<string, number> = {};
    members.forEach(m => {
      counts[m.role] = (counts[m.role] || 0) + 1;
    });
    return { list: Array.from(roles).sort(), counts };
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
    return { list: Array.from(uniqueQuals).sort(), counts };
  }, [members]);

  // Filter Logic
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        member.firstName.toLowerCase().includes(searchLower) ||
        member.lastName.toLowerCase().includes(searchLower) ||
        member.fdIdNumber.toLowerCase().includes(searchLower) ||
        member.cellPhone.toLowerCase().includes(searchLower) ||
        member.addressLine1.toLowerCase().includes(searchLower) ||
        member.city.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      const matchesRole = roleFilters.length === 0 || roleFilters.includes(member.role);
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

  // --- DISPATCH LOGIC ---
  const handleFindClosest = async () => {
    if (!incidentAddress || !window.google) return;
    setIsCalculating(true);
    setClosestMembers([]);
    setTargetLocation(null);

    const geocoder = new window.google.maps.Geocoder();
    const matrixService = new window.google.maps.DistanceMatrixService();

    try {
      // 1. Geocode the input address
      const geocodeResult = await geocoder.geocode({ address: incidentAddress });
      if (!geocodeResult.results[0]) throw new Error('Address not found');

      const targetLoc = geocodeResult.results[0].geometry.location;
      const targetLiteral = { lat: targetLoc.lat(), lng: targetLoc.lng() };
      setTargetLocation(targetLiteral);

      // Pan map to incident
      map?.panTo(targetLiteral);
      map?.setZoom(14);

      // 2. Optimization: Calculate linear distance to FILTERED members first
      // NOTE: Using filteredMembers here instead of all members
      const membersWithLinearDist = filteredMembers.map(m => {
        const memberLoc = new window.google.maps.LatLng(m.location.lat, m.location.lng);
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(memberLoc, targetLoc);
        return { ...m, linearDistance: distance };
      });

      // Take top 10 closest by straight line to check for actual driving time
      const candidates = membersWithLinearDist
        .sort((a, b) => a.linearDistance - b.linearDistance)
        .slice(0, 10);

      if (candidates.length === 0) {
        setIsCalculating(false);
        return;
      }

      // 3. Get Driving Metrics
      const driveResponse = await matrixService.getDistanceMatrix({
        origins: candidates.map(c => c.location),
        destinations: [targetLiteral],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
      });

      // 4. Get Walking Metrics
      const walkResponse = await matrixService.getDistanceMatrix({
        origins: candidates.map(c => c.location),
        destinations: [targetLiteral],
        travelMode: window.google.maps.TravelMode.WALKING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
      });

      // 5. Combine and Sort
      const results: ClosestMemberResult[] = candidates.map((member, i) => {
        const driveElement = driveResponse.rows[i].elements[0];
        const walkElement = walkResponse.rows[i].elements[0];

        // Handle cases where route not found
        const driveDist = driveElement.status === 'OK' ? driveElement.distance.text : 'N/A';
        const driveDur = driveElement.status === 'OK' ? driveElement.duration.text : 'N/A';
        const driveVal = driveElement.status === 'OK' ? driveElement.duration.value : 9999999;

        const walkDist = walkElement.status === 'OK' ? walkElement.distance.text : 'N/A';
        const walkDur = walkElement.status === 'OK' ? walkElement.duration.text : 'N/A';

        return {
          member,
          driving: { distance: driveDist, duration: driveDur, durationValue: driveVal },
          walking: { distance: walkDist, duration: walkDur }
        };
      });

      // Sort by Driving Duration and take top 5
      const top5 = results.sort((a, b) => a.driving.durationValue - b.driving.durationValue).slice(0, 5);
      setClosestMembers(top5);

    } catch (error) {
      console.error("Error finding closest members:", error);
      alert("Could not find address or calculate routes.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleClearDispatch = () => {
    setIncidentAddress('');
    setTargetLocation(null);
    setClosestMembers([]);
  };

  const handleResultClick = (member: Member) => {
    if (map) {
      map.panTo({ lat: member.location.lat, lng: member.location.lng });
      map.setZoom(18); // High zoom level to focus on pin
      setSelectedMember(member);
    }
  };
  // ----------------------

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const getPinIcon = useCallback((role: MemberRole): google.maps.Symbol | undefined => {
    if (typeof window === 'undefined' || !window.google) return undefined;
    let fillColor = '#ef4444';
    const strokeColor = '#000000';
    switch (role) {
      case MemberRole.CHIEF:
      case MemberRole.ASSISTANT_CHIEF:
      case MemberRole.DEPUTY_CHIEF: fillColor = '#FFFFFF'; break;
      case MemberRole.FULL_MEMBER:
      case MemberRole.LIFE: fillColor = '#FFD700'; break;
      case MemberRole.PROBATIONARY: fillColor = '#60A5FA'; break;
      default: fillColor = '#ef4444';
    }
    return {
      path: HELMET_SVG_PATH,
      fillColor: fillColor,
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: strokeColor,
      scale: 1.5,
      anchor: new window.google.maps.Point(12, 22),
      labelOrigin: new window.google.maps.Point(13, 12),
   };
  }, []);

  const getMemberLocation = (location: { lat: number; lng: number }): google.maps.LatLngLiteral => {
    if (isLoggedIn) return { lat: location.lat, lng: location.lng };
    const truncate = (n: number) => Math.trunc(n * 1000) / 1000;
    return { lat: truncate(location.lat), lng: truncate(location.lng) };
  };

  if (!isLoaded) return <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-500">Loading Map...</div>;

  return (
    <div className="relative w-full h-full group">
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
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
        }}
      >
        {/* Render Members */}
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
            onClick={() => isLoggedIn && setSelectedMember(member)}
            clickable={isLoggedIn}
          />
        ))}

        {/* Render Incident Target Marker */}
        {targetLocation && (
          <Marker
            position={targetLocation}
            title="Incident Location"
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#ef4444',
              fillOpacity: 0.6,
              strokeWeight: 2,
              strokeColor: 'white',
            }}
            animation={window.google.maps.Animation.DROP}
          />
        )}

        {/* Optional: Draw lines from closest members to target */}
        {targetLocation && closestMembers.map((res, i) => (
           <Polyline
             key={`line-${i}`}
             path={[res.member.location, targetLocation]}
             options={{
               strokeColor: i === 0 ? '#10b981' : '#6b7280', // Green for #1, gray for others
               strokeOpacity: 0.5,
               strokeWeight: 2,
               geodesic: true,
             }}
           />
        ))}

        {selectedMember && (
          <InfoWindow
            position={selectedMember.location}
            onCloseClick={() => setSelectedMember(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -25) }}
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
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Floating UI Layer */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 items-start z-10 w-72 max-w-[calc(100vw-32px)]">
        {isLoggedIn && (
          <>
            {/* --- DISPATCH BUTTON & PANEL --- */}
            <div className="flex flex-col items-start gap-2 w-full animate-in fade-in slide-in-from-left-2 duration-300 delay-75">
                {!isDispatchExpanded ? (
                    <button
                        onClick={() => { setIsDispatchExpanded(true); setIsFilterExpanded(false); }}
                        className="bg-white/95 backdrop-blur shadow-md rounded-md border border-gray-200 p-2 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-2 text-sm font-medium w-full"
                    >
                        <Siren className="w-4 h-4 text-red-600" />
                        <span>Dispatch</span>
                        {closestMembers.length > 0 && (
                             <span className="flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-[9px] text-white ml-auto">
                                {closestMembers.length}
                             </span>
                        )}
                    </button>
                ) : (
                    <div className="bg-white/95 backdrop-blur shadow-lg rounded-lg border border-gray-200 p-4 w-full space-y-4 max-h-[60vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                                <Siren className="w-3.5 h-3.5 text-red-600" /> Find Closest
                            </h4>
                            <button onClick={() => setIsDispatchExpanded(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                         <div className="flex gap-1">
                            <input
                                type="text"
                                placeholder="Enter incident address..."
                                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
                                value={incidentAddress}
                                onChange={(e) => setIncidentAddress(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFindClosest()}
                            />
                            <button
                                onClick={handleFindClosest}
                                disabled={isCalculating || !incidentAddress}
                                className="bg-blue-600 text-white px-2 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </button>
                        </div>

                        {closestMembers.length > 0 && (
                            <div className="space-y-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-700">Top 5 Responders (Filtered)</span>
                                    <button onClick={handleClearDispatch} className="text-[10px] text-red-500 hover:underline">Clear</button>
                                </div>
                                <div className="space-y-1.5">
                                    {closestMembers.map((res) => (
                                        <div
                                            key={res.member.id}
                                            className="bg-blue-50 border border-blue-100 rounded p-2 cursor-pointer hover:bg-blue-100 transition-colors"
                                            onClick={() => handleResultClick(res.member)}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex flex-col">
                                                    <span className="text-lg font-extrabold text-gray-900 leading-none">
                                                        {res.member.fdIdNumber}
                                                    </span>
                                                    <span className="text-xs text-gray-600 font-medium truncate">
                                                        {res.member.lastName}, {res.member.firstName}
                                                    </span>
                                                </div>
                                                <span className="text-blue-700 font-mono text-xs font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200">
                                                    {res.driving.duration}
                                                </span>
                                            </div>

                                            <div className="flex justify-between text-gray-500 text-[10px] border-t border-blue-100 pt-1 mt-1">
                                                <span className="flex items-center gap-1" title="Driving">
                                                    <Car className="w-3 h-3" /> {res.driving.distance}
                                                </span>
                                                <span className="flex items-center gap-1" title="Walking">
                                                    <Footprints className="w-3 h-3" /> {res.walking.duration}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-[10px] text-gray-400 italic text-center">
                            Results based on currently active map filters
                        </div>
                    </div>
                )}
            </div>

            {/* --- FILTERS BUTTON & PANEL --- */}
            <div className="flex flex-col items-start gap-2 w-full animate-in fade-in slide-in-from-left-2 duration-300">
                {!isFilterExpanded ? (
                <button
                    onClick={() => { setIsFilterExpanded(true); setIsDispatchExpanded(false); }}
                    className="bg-white/95 backdrop-blur shadow-md rounded-md border border-gray-200 p-2 hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-2 text-sm font-medium w-full"
                >
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                    {(roleFilters.length > 0 || qualFilters.length > 0 || searchTerm) && (
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-blue-500 text-[9px] text-white ml-auto">
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
                        <button onClick={() => setIsFilterExpanded(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                        <Users className="w-3 h-3" />
                        <span className="font-medium">{filteredMembers.length} Active Pins</span>
                    </div>

                    {/* Search Bar */}
                    <div className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Filter name, ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm placeholder:text-gray-400 text-gray-800" />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center"><label className="text-xs font-semibold text-gray-500">By Role</label>
                        {roleFilters.length > 0 && <button onClick={() => setRoleFilters([])} className="text-[10px] text-blue-600 hover:underline">Clear</button>}
                        </div>
                        <div className="border rounded-md border-gray-200 bg-gray-50/50 max-h-40 overflow-y-auto p-1">
                        {roleData.list.map(role => {
                            const isSelected = roleFilters.includes(role);
                            return (
                            <label key={role} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer transition-colors w-full">
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleRoleFilter(role)} />
                                <div className="flex-1 flex justify-between items-center text-xs text-gray-700 select-none">
                                <span className="capitalize">{role.replace(/_/g, ' ').toLowerCase()}</span>
                                <span className="text-gray-400 ml-2 bg-gray-100 px-1.5 py-0.5 rounded-full text-[10px]">{roleData.counts[role]}</span>
                                </div>
                            </label>
                            );
                        })}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center"><label className="text-xs font-semibold text-gray-500">By Qualification</label>
                        {qualFilters.length > 0 && <button onClick={() => setQualFilters([])} className="text-[10px] text-blue-600 hover:underline">Clear</button>}
                        </div>
                        <div className="border rounded-md border-gray-200 bg-gray-50/50 max-h-40 overflow-y-auto p-1">
                        {qualData.list.map(q => {
                            const isSelected = qualFilters.includes(q);
                            return (
                            <label key={q} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer transition-colors w-full">
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleQualFilter(q)} />
                                <div className="flex-1 flex justify-between items-center text-xs text-gray-700 select-none">
                                <span>{q}</span>
                                <span className="text-gray-400 ml-2 bg-gray-100 px-1.5 py-0.5 rounded-full text-[10px]">{qualData.counts[q]}</span>
                                </div>
                            </label>
                            );
                        })}
                        </div>
                    </div>

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
          </>
        )}
      </div>
    </div>
  );
}
