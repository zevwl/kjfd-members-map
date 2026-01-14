import React from 'react';
import FireMap from '@/components/map/FireMap';
import { Member, MemberRole, ActivityStatus } from '@/types';

// Mock data for initial UI development
const mockMembers: Member[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    fdIdNumber: '101',
    cellPhone: '555-0101',
    addressLine1: '123 Main St',
    city: 'Kiryas Joel',
    state: 'NY',
    location: { lat: 41.353500, lng: -74.174810 },
    status: ActivityStatus.REGULAR,
    role: MemberRole.CHIEF,
    qualifications: ['Ladder Driver', 'Interior'],
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    fdIdNumber: '205',
    cellPhone: '555-0202',
    addressLine1: '456 Oak Ave',
    city: 'Monroe',
    state: 'NY',
    location: { lat: 41.323845, lng: -74.152276 },
    status: ActivityStatus.REGULAR,
    role: MemberRole.FULL_MEMBER,
    qualifications: ['EMT', 'Pump Operator'],
  },
];

export default function Home() {
  return (
    <div className="h-full w-full flex flex-col px-4 p-4 md:p-6">
       {/* Full screen map container with dashboard-like styling */}
      <div className="flex-1 w-full relative bg-white overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <FireMap members={mockMembers} />

        {/* Floating Controls */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-2 rounded shadow-md z-10 border border-gray-100">
           <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Live Map</span>
        </div>
      </div>
    </div>
  );
}
