'use client';

import { useState } from 'react';
import { AdminUserView, UserRole } from '@/types';
import { Check, Trash2, AlertCircle, Shield } from 'lucide-react';
import { approveUser, deleteUser, updateUserRole } from '@/lib/admin-actions';

// Define a minimal User type for the UI matching the query in page.tsx

export default function UsersManager({ users }: { users: AdminUserView[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!newRole) return;
    setLoadingId(userId);
    try {
      // If role is NONE, we are effectively un-approving or keeping them pending
      if (newRole === UserRole.NONE) {
        await updateUserRole(userId, newRole as UserRole);
      } else {
        await approveUser(userId, newRole as UserRole);
      }
    } catch (error) {
      console.log(error)
      alert('Failed to update user');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    setLoadingId(userId);
    try {
      await deleteUser(userId);
    } catch (error) {
      console.log(error);
      alert('Failed to delete user');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User Account</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role Assignment</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined Date</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isPending = !user.role || user.role === UserRole.NONE;

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                         <div className="p-1.5 bg-gray-100 rounded-full text-gray-500">
                            <Shield className="w-4 h-4" />
                         </div>
                         <div>
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          <div className="text-xs text-gray-400 font-mono">ID: {user.id.slice(0, 8)}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        disabled={loadingId === user.id}
                        value={user.role || UserRole.NONE}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`block w-full max-w-50 rounded-md border-gray-300 py-1.5 pl-3 pr-8 text-xs sm:text-sm focus:border-brand-red focus:ring-brand-red disabled:opacity-50 cursor-pointer ${
                          isPending ? 'text-gray-500 italic' : 'text-gray-900'
                        }`}
                      >
                        <option value={UserRole.NONE}>None (Pending)</option>
                        <option value={UserRole.MEMBER}>Member (Read Only)</option>
                        <option value={UserRole.MANAGER}>Manager (Edit Data)</option>
                        <option value={UserRole.ADMIN}>Admin (Full Access)</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       {!isPending ? (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                           <Check className="w-3 h-3 mr-1" /> Active
                         </span>
                       ) : (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 animate-pulse">
                           <AlertCircle className="w-3 h-3 mr-1" /> Pending
                         </span>
                       )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user.role !== UserRole.ADMIN && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={loadingId === user.id}
                          className="text-gray-400 hover:text-red-600 disabled:opacity-50 transition-colors p-2 hover:bg-red-50 rounded-full"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
