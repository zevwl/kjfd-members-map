import React from 'react';
import Link from 'next/link';
import FireMap from '@/components/map/FireMap';
import { Member, MemberRole, ActivityStatus } from '@/types';

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
    <div className="flex flex-col h-screen w-screen bg-gray-50">
      {/* Header */}
      <header className="flex-none h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-brand-red text-sm font-bold text-white shadow-sm ring-1 ring-white">
            FD
          </div>
          <h1 className="text-xl font-bold text-gray-900">FD Response Map</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-red"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-hidden">
        <div className="h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md relative">
          <FireMap members={mockMembers} />
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-none py-3 text-center text-xs text-gray-500 bg-white border-t border-gray-200">
        &copy; {new Date().getFullYear()} Fire Department Response System. All rights reserved.
      </footer>
    </div>
  );
}
