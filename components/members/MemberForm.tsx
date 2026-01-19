'use client';

import { useActionState, useState, KeyboardEvent, useRef } from 'react';
import { upsertMember, getMemberCoordinates } from '@/lib/member-actions';
import { Member, MemberRole, ActivityStatus } from '@/types';
import { Loader2, X, MapPin } from 'lucide-react';
import MemberLocationMap from './MemberLocationMap';

interface MemberFormProps {
  member?: Member | null;
  onClose: () => void;
  availableQualifications?: string[];
}

export default function MemberForm({ member, onClose, availableQualifications = [] }: MemberFormProps) {
  const [state, dispatch, isPending] = useActionState(upsertMember, {});

  // Manage Tags State
  const [tags, setTags] = useState<string[]>(member?.qualifications || []);
  const [tagInput, setTagInput] = useState('');

  // Location State
  const [showMap, setShowMap] = useState(!!(member?.location?.lat && member?.location?.lng));
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    member?.location && member.location.lat !== 0 ? member.location : null
  );
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Address Refs for easy access
  const formRef = useRef<HTMLFormElement>(null);

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = (text: string) => {
    const cleanText = text.trim();
    if (cleanText && !tags.includes(cleanText)) {
      setTags([...tags, cleanText]);
    }
    setTagInput('');
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // Handle Location Verification
  const handleVerifyLocation = async () => {
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const address = `${formData.get('addressLine1')}, ${formData.get('city')}, ${formData.get('state')} ${formData.get('zipCode')}`;

    setIsGeocoding(true);
    try {
      const coords = await getMemberCoordinates(address);
      if (coords) {
        setLocation(coords);
        setShowMap(true);
      } else {
        alert('Could not find location. Please check the address.');
      }
    } catch (e) {
      console.error(e);
      alert('Error verifying location.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleManualLocationChange = (lat: number, lng: number) => {
    setLocation({ lat, lng });
  };

  // Close modal if success
  if (state.message === 'Success') {
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex-none flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            {member ? 'Edit Member' : 'Add New Member'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <form ref={formRef} action={dispatch} className="space-y-4">
            {member && <input type="hidden" name="id" value={member.id} />}

            {/* Hidden input to submit tags */}
            <input type="hidden" name="qualifications" value={tags.join(',')} />

            {/* Hidden inputs for coordinates */}
            {location && (
              <>
                <input type="hidden" name="lat" value={location.lat} />
                <input type="hidden" name="lng" value={location.lng} />
              </>
            )}

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

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-red" />
                Address & Location
              </h4>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 uppercase">Address Line 1</label>
                  <input
                    name="addressLine1"
                    defaultValue={member?.addressLine1}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 uppercase">Address Line 2</label>
                  <input
                    name="addressLine2"
                    defaultValue={member?.addressLine2 || ''}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-500 uppercase">City</label>
                  <input
                    name="city"
                    defaultValue={member?.city || 'Kiryas Joel'}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">State</label>
                  <input
                    name="state"
                    defaultValue={member?.state || 'NY'}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase">Zip</label>
                  <input
                    name="zipCode"
                    defaultValue={member?.zipCode || '10950'}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleVerifyLocation}
                  disabled={isGeocoding}
                  className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-1"
                >
                  {isGeocoding ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                  {location ? 'Update Pin Location' : 'Locate on Map'}
                </button>
              </div>

              {showMap && location && (
                <div className="mt-4 animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-xs text-gray-500 mb-2">
                    Drag the marker to adjust the exact location.
                  </p>
                  <MemberLocationMap
                    initialLat={location.lat}
                    initialLng={location.lng}
                    onLocationChange={handleManualLocationChange}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  name="role"
                  defaultValue={member?.role || MemberRole.FULL_MEMBER}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
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
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value={ActivityStatus.REGULAR}>Regular</option>
                  <option value={ActivityStatus.LOW}>Low Activity</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qualifications</label>
              <div className="min-h-10.5 p-1.5 w-full rounded-md border border-gray-300 bg-white focus-within:ring-1 focus-within:ring-brand-red focus-within:border-brand-red flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-sm text-gray-800 border border-gray-200">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="ml-1 text-gray-500 hover:text-red-500 focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  list="qual-options"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => addTag(tagInput)}
                  placeholder={tags.length === 0 ? "Select or type..." : ""}
                  className="flex-1 min-w-30 outline-none text-sm bg-transparent"
                />
                <datalist id="qual-options">
                  {availableQualifications.map((q) => (
                    <option key={q} value={q} />
                  ))}
                </datalist>
              </div>
              <p className="text-xs text-gray-500 mt-1">Press Enter or comma to add a new tag.</p>
            </div>

            {state.message && state.message !== 'Success' && (
              <p className="text-red-500 text-sm">{state.message}</p>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-red rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {member ? 'Update Member' : 'Create Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
