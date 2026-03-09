'use client';

import { useState } from 'react';
import { updateProfile } from '@/lib/profile-actions';
import { useRouter } from 'next/navigation';
import { Member, User } from '@/generated/client';
import {
  User as UserIcon,
  Lock,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';

interface UserProfileProps {
  user: User & { member?: Member | null };
}

export default function UserProfile({ user }: UserProfileProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    setError('');
    setSuccess('');

    const result = await updateProfile(formData);

    if (result.success) {
      setSuccess('Profile updated successfully');
      router.refresh();
      const form = document.getElementById('profile-form') as HTMLFormElement;
      if (form) form.reset();
    } else {
      setError(result.error || 'Failed to update profile');
    }
    setIsPending(false);
  };

  const initials = user.member
    ? `${user.member.firstName[0]}${user.member.lastName[0]}`.toUpperCase()
    : user.email.substring(0, 2).toUpperCase();

  const displayName = user.member
    ? `${user.member.firstName} ${user.member.lastName}`
    : user.email;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-28 bg-linear-to-r from-brand-red to-red-700 flex items-end px-6 pb-0">
          <div className="h-20 w-20 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-brand-red shrink-0 translate-y-10">
            {initials}
          </div>
        </div>
        <div className="px-6 pb-6 pt-14">
          <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
            <Mail className="h-3.5 w-3.5" />
            <span>{user.email}</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
          <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <form id="profile-form" action={handleSubmit} className="space-y-6">
        {/* Account Security */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-lg bg-gray-100">
              <Lock className="h-4 w-4 text-gray-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Account Security</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  disabled
                  value={user.email}
                  className="pl-9 block w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm py-2.5 cursor-not-allowed"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Email cannot be changed. Contact an admin if needed.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    id="password"
                    className="block w-full rounded-lg border border-gray-300 text-sm py-2.5 px-3 pr-10 focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition"
                    placeholder="Leave blank to keep current"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    id="confirmPassword"
                    className="block w-full rounded-lg border border-gray-300 text-sm py-2.5 px-3 pr-10 focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition"
                    placeholder="Repeat new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        {user.member && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-gray-100">
                <UserIcon className="h-4 w-4 text-gray-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Contact Details</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                  <input
                    type="text"
                    disabled
                    value={user.member.firstName}
                    className="block w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm py-2.5 px-3 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    disabled
                    value={user.member.lastName}
                    className="block w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm py-2.5 px-3 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cellPhone" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cell Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    name="cellPhone"
                    id="cellPhone"
                    defaultValue={user.member.cellPhone}
                    className="pl-9 block w-full rounded-lg border border-gray-300 text-sm py-2.5 focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Address</span>
                </div>
                <div className="space-y-3 pl-6">
                  <input
                    type="text"
                    name="addressLine1"
                    id="addressLine1"
                    defaultValue={user.member.addressLine1}
                    placeholder="Address Line 1"
                    className="block w-full rounded-lg border border-gray-300 text-sm py-2.5 px-3 focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition"
                  />
                  <input
                    type="text"
                    name="addressLine2"
                    id="addressLine2"
                    defaultValue={user.member.addressLine2 || ''}
                    placeholder="Address Line 2 (optional)"
                    className="block w-full rounded-lg border border-gray-300 text-sm py-2.5 px-3 focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <input
                        type="text"
                        name="city"
                        id="city"
                        defaultValue={user.member.city}
                        placeholder="City"
                        className="block w-full rounded-lg border border-gray-300 text-sm py-2.5 px-3 focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition"
                      />
                    </div>
                    <input
                      type="text"
                      name="state"
                      id="state"
                      defaultValue={user.member.state}
                      placeholder="State"
                      className="block w-full rounded-lg border border-gray-300 text-sm py-2.5 px-3 focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition"
                    />
                    <input
                      type="text"
                      name="zipCode"
                      id="zipCode"
                      defaultValue={user.member.zipCode}
                      placeholder="Zip Code"
                      className="block w-full rounded-lg border border-gray-300 text-sm py-2.5 px-3 focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pb-4">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red"
          >
            <Save className="h-4 w-4" />
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
