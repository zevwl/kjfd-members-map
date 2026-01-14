'use client';

import { useActionState } from 'react';
import { upsertMember } from '@/lib/member-actions';
import { Member, MemberRole, ActivityStatus } from '@/types';
import { Loader2 } from 'lucide-react';

interface MemberFormProps {
  member?: Member | null;
  onClose: () => void;
}

export default function MemberForm({ member, onClose }: MemberFormProps) {
  const [state, dispatch, isPending] = useActionState(upsertMember, {});

  // Close modal if success (you might want a better UX trigger here)
  if (state.message === 'Success') {
    onClose();
  }

  return (
    <form action={dispatch} className="space-y-4">
      {member && <input type="hidden" name="id" value={member.id} />}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">First Name</label>
          <input
            name="firstName"
            defaultValue={member?.firstName}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Last Name</label>
          <input
            name="lastName"
            defaultValue={member?.lastName}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">FD ID #</label>
          <input
            name="fdIdNumber"
            defaultValue={member?.fdIdNumber}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Cell Phone</label>
          <input
            name="cellPhone"
            defaultValue={member?.cellPhone}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Address Line 1</label>
        <input
          name="addressLine1"
          defaultValue={member?.addressLine1}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700">City</label>
          <input
            name="city"
            defaultValue={member?.city || 'Spring Valley'}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">State</label>
          <input
            name="state"
            defaultValue={member?.state || 'NY'}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Zip</label>
          <input
            name="zipCode"
            defaultValue="10977"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            name="role"
            defaultValue={member?.role || MemberRole.PROBATIONARY}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {Object.values(MemberRole).map((role) => (
              <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            defaultValue={member?.status || ActivityStatus.REGULAR}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value={ActivityStatus.REGULAR}>Regular</option>
            <option value={ActivityStatus.LOW}>Low Activity</option>
          </select>
        </div>
      </div>

      {state.message && state.message !== 'Success' && (
        <p className="text-red-500 text-sm">{state.message}</p>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-red rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Member
        </button>
      </div>
    </form>
  );
}
