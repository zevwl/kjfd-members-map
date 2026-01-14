'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { UserRole } from '@/types';
import type { User } from 'next-auth';
import { Users, User as UserIcon, LogOut, Key } from 'lucide-react';
import Image from 'next/image';

interface DashboardNavProps {
  // User is optional now for public view
  user?: (User & { role: UserRole }) | null;
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const isAdmin = user?.role === UserRole.ADMIN;
  const isManager = user?.role === UserRole.MANAGER || isAdmin;

  return (
    <nav className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between shadow-sm z-20 relative">
      <div className="flex items-center gap-6">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/icon-512.png"
            alt="Members Map Icon"
            width={32}
            height={32}
            className="h-8 w-8 rounded object-cover shadow-sm ring-1 ring-gray-200"
          />
          <span className="font-bold text-gray-900 text-lg tracking-tight hidden sm:block">Members Map</span>
        </Link>

        {/* Members Link - Visible only for Managers and Admins */}
        {isManager && (
          <div className="flex items-center pl-4 border-l border-gray-300 h-8">
            <Link
              href="/members"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-red transition-colors px-2 py-1 rounded hover:bg-gray-50"
            >
              <Users className="h-4 w-4" />
              <span>Members</span>
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {!user ? (
          /* Public View: Login Key */
          <Link
            href="/login"
            className="p-2 text-gray-600 hover:text-brand-red transition-colors rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-red"
            title="Member Login"
          >
            <Key className="h-5 w-5" />
          </Link>
        ) : (
          /* Logged In View: Profile Dropdown */
          <div className="group relative h-full flex items-center">
            <button className="p-2 text-gray-600 hover:text-brand-red transition-colors rounded-full hover:bg-gray-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-red">
                 <UserIcon className="h-6 w-6" />
            </button>

            {/* Dropdown Menu */}
            {/* Fixed: Use padding-top (pt-2) instead of margin-top to bridge the hover gap */}
            <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover:block z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="bg-white rounded-md shadow-lg py-1 border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
                      <p className="text-xs text-gray-500 capitalize mt-0.5 font-medium">{user.role?.toLowerCase().replace('_', ' ')}</p>
                  </div>

                  {isAdmin && (
                    <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-red">
                      Admin Settings
                    </Link>
                  )}

                  <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                  >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                  </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
