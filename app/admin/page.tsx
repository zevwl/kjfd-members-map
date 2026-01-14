import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { AdminUserView, UserRole } from '@/types';
import { prisma } from '@/lib/prisma';
import { User } from '@/generated/client';
import UsersManager from '@/components/admin/UsersManager';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as User).role as UserRole | undefined;

  // Protect route
  if (userRole !== UserRole.ADMIN) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            Only Administrators can access the User Management page.
          </p>
        </div>
      </div>
    );
  }

  // Fetch all users
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      approvedBy: {
        select: { email: true }
      }
    }
  }) as AdminUserView[];

  return (
    <div className="h-full w-full overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Approve new signups and manage system access roles.
          </p>
        </div>

        <UsersManager users={users} />
      </div>
    </div>
  );
}
