import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { UserRole, Member, ActivityStatus, MemberRole } from '@/types';
import { prisma } from '@/lib/prisma';
import { Clock } from 'lucide-react';
import MembersManager from '@/components/members/MembersManager';
import { User } from '@/generated/client';

export default async function MembersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as User).role as UserRole | null | undefined;

  // 1. Handle Pending Users (No Role)
  if (!userRole || userRole === UserRole.NONE) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-md w-full">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-4">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account Pending</h2>
          <p className="text-gray-600 mb-6">
            Your account is currently awaiting approval. Please contact an administrator to activate your access.
          </p>
          <div className="text-xs text-gray-400">
            Account Email: {session.user.email}
          </div>
        </div>
      </div>
    );
  }

  // Fetch real members from DB
  const rawMembers = await prisma.member.findMany({
    orderBy: { lastName: 'asc' },
    include: { qualifications: true }
  });

  // Map to frontend Member type to ensure consistent shape (flattening qualifications)
  const members: Member[] = rawMembers.map(m => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    fdIdNumber: m.fdIdNumber,
    cellPhone: m.cellPhone,
    addressLine1: m.addressLine1,
    addressLine2: m.addressLine2, // Mapped here
    city: m.city,
    state: m.state,
    zipCode: m.zipCode,
    status: m.status as unknown as ActivityStatus,
    role: m.role as unknown as MemberRole,
    location: {
      lat: m.lat ?? 0,
      lng: m.lng ?? 0
    },
    qualifications: m.qualifications.map(q => q.name)
  }));

  return (
    <div className="h-full w-full overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <MembersManager initialMembers={members} userRole={userRole} />
      </div>
    </div>
  );
}
