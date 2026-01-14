import React from 'react';
import FireMap from '@/components/map/FireMap';
import { prisma } from '@/lib/prisma';
import { Member, ActivityStatus, MemberRole } from '@/types'; // Import enums from types
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Force dynamic rendering so we always get the latest members on refresh
export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  // 1. Fetch members from DB with their qualifications
  const rawMembers = await prisma.member.findMany({
    where: {
      // Only get members that have valid coordinates
      lat: { not: null },
      lng: { not: null },
    },
    include: {
      qualifications: true,
    },
  });

  // 2. Map Database structure to Frontend 'Member' interface
  // - Combine lat/lng into 'location' object
  // - Flatten qualifications array to strings
  // - Cast Enums to ensure type compatibility between Prisma and Local types
  const members: Member[] = rawMembers.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    fdIdNumber: m.fdIdNumber,
    cellPhone: m.cellPhone,
    addressLine1: m.addressLine1,
    city: m.city,
    state: m.state,
    // Cast Prisma enum to Local enum using 'unknown' as intermediate step
    status: m.status as unknown as ActivityStatus,
    role: m.role as unknown as MemberRole,
    // We filtered for non-null in the query, so casting is safe here
    location: {
      lat: m.lat!,
      lng: m.lng!,
    },
    qualifications: m.qualifications.map((q) => q.name),
  }));

  return (
    <div className="h-full w-full flex flex-col px-4 p-4 md:p-6">
       {/* Full screen map container with dashboard-like styling */}
      <div className="flex-1 w-full relative bg-white overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <FireMap members={members} enablePopups={isLoggedIn} />

        {/* Floating Controls */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-2 rounded shadow-md z-10 border border-gray-100">
           <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Live Map</span>
           <span className="text-[10px] text-gray-400 block px-1 mt-0.5">{members.length} Active Pins</span>
        </div>
      </div>
    </div>
  );
}
