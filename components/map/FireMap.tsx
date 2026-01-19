'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Member, MemberRole } from '@/types';
import { Filter, Users, X, Check, Search, Car, Footprints, Loader2, Siren, Route, Timer } from 'lucide-react';

import { API_LOADER_OPTIONS } from '@/lib/google-maps';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 41.340992,
  lng: -74.168008,
};

// Approximate bounds for Kiryas Joel, NY area to bias search results
const KJ_BOUNDS = {
  north: 41.360,
  south: 41.320,
  west: -74.200,
  east: -74.140,
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
  const { isLoaded } = useJsApiLoader(API_LOADER_OPTIONS);

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
  const [maxTravelTime, setMaxTravelTime] = useState(15);
  const [isEditingTime, setIsEditingTime] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]); // Track polyline instances

  // Derive unique lists and counts
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

  // Ref to keep track of filtered members inside async callbacks/listeners
  const filteredMembersRef = useRef(filteredMembers);
  useEffect(() => {
    filteredMembersRef.current = filteredMembers;
  }, [filteredMembers]);

  // Ref to keep track of maxTravelTime inside async callbacks/listeners
  const maxTravelTimeRef = useRef(maxTravelTime);
  useEffect(() => {
    maxTravelTimeRef.current = maxTravelTime;
  }, [maxTravelTime]);

  // --- POLYLINE MANAGEMENT (IMPERATIVE) ---
  useEffect(() => {
    // 1. Clear existing polylines
    polylinesRef.current.forEach(poly => poly.setMap(null));
    polylinesRef.current = [];

    // 2. If no data or no map, exit
    if (!map || !targetLocation || closestMembers.length === 0) return;

    // 3. Draw new polylines
    closestMembers.forEach((res, i) => {
        const line = new window.google.maps.Polyline({
            path: [res.member.location, targetLocation],
            geodesic: true,
            strokeColor: i === 0 ? '#10b981' : '#6b7280', // Green for #1, gray for others
            strokeOpacity: 0.5,
            strokeWeight: 2,
            map: map // Bind directly to map
        });
        polylinesRef.current.push(line);
    });

  }, [closestMembers, targetLocation, map]);


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

  // Core calculation function separated from Geocoding
  // Wrapped in useCallback to be a stable dependency for useEffect
  const calculateRoutes = useCallback(async (targetLiteral: google.maps.LatLngLiteral) => {
    if (!window.google) return;

    setIsCalculating(true);
    setClosestMembers([]); // Clear previous lines immediately
    setTargetLocation(targetLiteral); // Update target marker immediately

    // Pan map to incident
    map?.panTo(targetLiteral);
    map?.setZoom(14);

    const matrixService = new window.google.maps.DistanceMatrixService();
    const targetLoc = new window.google.maps.LatLng(targetLiteral.lat, targetLiteral.lng);

    try {
      // 1. Optimization: Calculate linear distance to FILTERED members first
      // Use ref to ensure we have latest filtered list inside async/listener scope
      const membersToCheck = filteredMembersRef.current;

      const membersWithLinearDist = membersToCheck.map(m => {
        const memberLoc = new window.google.maps.LatLng(m.location.lat, m.location.lng);
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(memberLoc, targetLoc);
        return { ...m, linearDistance: distance };
      });

      // Take top 20 closest by straight line to check for actual driving time
      // Increased from 10 to 20 to account for potential filtering by travel time later
      const candidates = membersWithLinearDist
        .sort((a, b) => a.linearDistance - b.linearDistance)
        .slice(0, 20);

      if (candidates.length === 0) {
        setIsCalculating(false);
        return;
      }

      // 2. Get Driving Metrics
      const driveResponse = await matrixService.getDistanceMatrix({
        origins: candidates.map(c => c.location),
        destinations: [targetLiteral],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
      });

      // 3. Get Walking Metrics
      const walkResponse = await matrixService.getDistanceMatrix({
        origins: candidates.map(c => c.location),
        destinations: [targetLiteral],
        travelMode: window.google.maps.TravelMode.WALKING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
      });

      // 4. Combine and Sort
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

      // Filter by Max Travel Time and Sort
      // Use ref here or state if we wanted recalculation on state change (but this function runs once per search)
      // Since this function is triggered by an event, using ref is safer against stale closures if dependencies change
      const maxSeconds = maxTravelTimeRef.current * 60;
      const top5 = results
        .filter(r => r.driving.durationValue <= maxSeconds)
        .sort((a, b) => a.driving.durationValue - b.driving.durationValue)
        .slice(0, 5);

      setClosestMembers(top5);

    } catch (error) {
      console.error("Error calculating routes:", error);
    } finally {
      setIsCalculating(false);
    }
  }, [map]); // Dependency on map instance

  // Manual Trigger (e.g., Enter key)
  const handleFindClosest = async () => {
    if (!incidentAddress || !window.google) return;

    // Clear state before starting new search
    setClosestMembers([]);
    setTargetLocation(null);
    setIsCalculating(true);

    const geocoder = new window.google.maps.Geocoder();

    try {
      const geocodeResult = await geocoder.geocode({
        address: incidentAddress,
        componentRestrictions: { country: "us" },
        bounds: KJ_BOUNDS // Bias towards KJ
      });

      if (!geocodeResult.results[0]) throw new Error('Address not found');

      const targetLoc = geocodeResult.results[0].geometry.location;
      const targetLiteral = { lat: targetLoc.lat(), lng: targetLoc.lng() };

      calculateRoutes(targetLiteral);
    } catch (error) {
      console.error("Geocoding error:", error);
      alert("Could not find address.");
      setIsCalculating(false);
    }
  };

  const handleClearDispatch = () => {
    setIncidentAddress('');
    setTargetLocation(null);
    setClosestMembers([]);
    // Reset map view to default
    map?.panTo(defaultCenter);
    map?.setZoom(13);
  };

  const handleResultClick = (member: Member) => {
    if (map) {
      map.panTo({ lat: member.location.lat, lng: member.location.lng });
      map.setZoom(18); // High zoom level to focus on pin
      setSelectedMember(member);
    }
  };

  // Initialize Autocomplete
  useEffect(() => {
    if (isLoaded && isDispatchExpanded && inputRef.current && window.google) {
      // Clear any existing listeners or instances attached to previous inputs
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }

      // Always create a fresh instance when the panel opens/re-renders
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        bounds: KJ_BOUNDS,
        componentRestrictions: { country: "us" },
        fields: ["geometry", "formatted_address", "name"],
        strictBounds: false // Bias towards KJ, but allow nearby
      });

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();

        if (place && place.geometry && place.geometry.location) {
          const address = place.formatted_address || place.name || "";
          const location = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };

          setIncidentAddress(address);
          // Directly trigger calculation with the geometry from Autocomplete
          calculateRoutes(location);
        }
      });

      // Cleanup on unmount or dependency change
      return () => {
         if (autocompleteRef.current) {
            window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
            autocompleteRef.current = null;
         }
      };
    }
  }, [isLoaded, isDispatchExpanded, calculateRoutes]); // Added calculateRoutes dependency

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

        {/* Polylines are handled via useEffect now to ensure cleanup */}

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
            <div className="flex flex-col items-start gap-2 w-full animate-in fade-in slide-in-from-left-2 duration-300">
                {!isDispatchExpanded ? (
                    <button
                        onClick={() => { setIsDispatchExpanded(true); setIsFilterExpanded(false); }}
                        className="bg-white/95 backdrop-blur shadow-md rounded-md border border-gray-200 p-2 hover:bg-gray-50 text-gray-700 transition-colors flex items-center justify-center relative w-10 h-10 group"
                        title="Dispatch"
                    >
                        <Siren className="w-5 h-5 text-red-600" />
                        {closestMembers.length > 0 && (
                             <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-[9px] text-white border border-white">
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

                         <div className="flex gap-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Enter incident address..."
                                className="flex-1 text-sm border border-gray-300 text-gray-800 rounded px-2 py-1.5 focus:border-blue-500 outline-none"
                                value={incidentAddress}
                                onChange={(e) => {
                                  setIncidentAddress(e.target.value);
                                  // Always clear artifacts when user modifies text manually
                                  // This ensures "on second address" or "cleared" scenarios work perfectly
                                  setTargetLocation(null);
                                  setClosestMembers([]);

                                  // If cleared completely, reset map view
                                  if (e.target.value === '') {
                                    map?.panTo(defaultCenter);
                                    map?.setZoom(13);
                                  }
                                }}
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

                        {/* Max Travel Time - Discrete UI Below Input */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 pl-1">
                                <Timer className="w-3 h-3" />
                                <span>
                                    Max <span
                                        className="font-bold text-gray-600 cursor-pointer hover:text-blue-600 underline decoration-dotted decoration-gray-300 underline-offset-2"
                                        onClick={() => setIsEditingTime(!isEditingTime)}
                                        title="Click to adjust max travel time"
                                    >
                                        {maxTravelTime}
                                    </span> min travel
                                </span>
                            </div>

                            {isEditingTime && (
                                <div className="flex items-center gap-2 px-1 pt-1 animate-in slide-in-from-top-1 fade-in duration-200">
                                    <input
                                        type="range"
                                        min="5"
                                        max="60"
                                        step="5"
                                        value={maxTravelTime}
                                        onChange={(e) => setMaxTravelTime(Number(e.target.value))}
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <span className="text-[10px] font-medium text-blue-600 w-6 text-right">{maxTravelTime}m</span>
                                </div>
                            )}
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
                                                <span className="flex items-center gap-1 text-blue-700 font-mono text-xs font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200">
                                                    <Car className="w-3 h-3" /> {res.driving.duration}
                                                </span>
                                            </div>

                                            <div className="flex justify-between text-gray-500 text-[10px] border-t border-blue-100 pt-1 mt-1">
                                                <span className="flex items-center gap-1" title="Driving">
                                                    <Route className="w-3 h-3" /> {res.driving.distance}
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

                        {(roleFilters.length > 0 || qualFilters.length > 0 || searchTerm) && (
                          <div className="text-[10px] text-gray-400 italic text-center">
                              Results based on currently active map filters
                          </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- FILTERS BUTTON & PANEL --- */}
            <div className="flex flex-col items-start gap-2 w-full animate-in fade-in slide-in-from-left-2 duration-300 delay-75">
                {!isFilterExpanded ? (
                <button
                    onClick={() => { setIsFilterExpanded(true); setIsDispatchExpanded(false); }}
                    className="bg-white/95 backdrop-blur shadow-md rounded-md border border-gray-200 p-2 hover:bg-gray-50 text-gray-700 transition-colors flex items-center justify-center relative w-10 h-10 group"
                    title="Filters"
                >
                    <Filter className="w-5 h-5" />
                    {(roleFilters.length > 0 || qualFilters.length > 0 || searchTerm) && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 rounded-full bg-blue-500 text-[9px] text-white border border-white">
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
                        onClick={() => {
                            setRoleFilters([]);
                            setQualFilters([]);
                            setSearchTerm('');
                            handleClearDispatch();
                        }}
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
