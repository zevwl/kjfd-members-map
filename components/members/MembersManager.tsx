'use client';

import { useState, useMemo } from 'react';
import { Member, UserRole } from '@/types';
import { Plus, Search, Edit2, Trash2, X, FileUp, MapPinCheckInside, MapPinOff } from 'lucide-react';
import MemberForm from './MemberForm';
import ImportExportModal from './ImportExportModal';
import { deleteMember } from '@/lib/member-actions';

interface MembersManagerProps {
  initialMembers: Member[];
  userRole?: UserRole; // To check permissions
}

export default function MembersManager({ initialMembers, userRole }: MembersManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Derive unique list of all existing qualifications for autocomplete
  const availableQualifications = useMemo(() => {
    const allQuals = initialMembers.flatMap(m => m.qualifications);
    return Array.from(new Set(allQuals)).sort();
  }, [initialMembers]);

  // Simple client-side search
  const filteredMembers = initialMembers.filter((m) =>
    m.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.fdIdNumber.toLowerCase().includes(searchTerm) ||
    m.qualifications.some(q => q.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const canManage = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this member?')) {
      await deleteMember(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
  };

  // Helper to check if member has valid location data
  const hasLocation = (member: Member) => {
    console.log(member);
    console.log(member.location);
    return member.location && member.location.lat !== 0  && member.location.lng !== 0;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredMembers.length} Members found
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or tag..."
              className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {canManage && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
              >
                <FileUp className="h-4 w-4" />
                <span className="hidden sm:inline">Import/Export</span>
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-brand-red text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Member</span>
                <span className="sm:hidden">Add</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID & Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Qualifications</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                {canManage && <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                    No members match your search.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-start gap-3">
                        {/* Map Pin Icon */}
                         <div className="pt-1" title="test">
                          {hasLocation(member) ?
                            <MapPinCheckInside />
                            :
                            <MapPinOff />
                          }
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{member.lastName}, {member.firstName}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {member.addressLine1}
                            {member.addressLine2 && `, ${member.addressLine2}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-900 font-mono">#{member.fdIdNumber}</span>
                        <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          {member.role.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-50">
                        {member.qualifications.length > 0 && (
                          member.qualifications.map((q, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              {q}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a href={`tel:${member.cellPhone}`} className="text-gray-600 hover:text-brand-red font-medium hover:underline">{member.cellPhone}</a>
                    </td>

                    {canManage && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(member)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay - Updated for Scrolling */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex-none flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingMember ? 'Edit Member' : 'Add New Member'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <MemberForm
                member={editingMember}
                onClose={handleCloseModal}
                availableQualifications={availableQualifications}
              />
            </div>
          </div>
        </div>
      )}

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        members={initialMembers}
      />
    </div>
  );
}
