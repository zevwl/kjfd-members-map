import React from 'react';
import FireMap from '../components/map/FireMap';
import { Member, MemberRole, ActivityStatus } from '../types';

// Mock data for initial UI development
// This will eventually be replaced by a database fetch
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
    <main className="flex h-screen w-screen flex-col">
      {/* Header / Nav could go here */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 p-3 rounded shadow-lg backdrop-blur-sm">
        <h1 className="text-xl font-bold text-brand-dark">FD Response Map</h1>
      </div>

      <div className="flex-1 w-full h-full relative">
        <FireMap members={mockMembers} />
      </div>
    </main>
  );
}
