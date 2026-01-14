'use server';

import { prisma } from '@/lib/prisma';
import { geocodeAddress } from './google-maps';
import { revalidatePath } from 'next/cache';
import { MemberRole, ActivityStatus } from '@/generated/client';

export type MemberFormState = {
  message?: string;
  errors?: Record<string, string[]>;
};

export async function upsertMember(
  prevState: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  const id = formData.get('id') as string | null;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const fdIdNumber = formData.get('fdIdNumber') as string;
  const cellPhone = formData.get('cellPhone') as string;
  const addressLine1 = formData.get('addressLine1') as string;
  const city = formData.get('city') as string;
  const state = formData.get('state') as string;
  const zipCode = formData.get('zipCode') as string;
  const role = formData.get('role') as MemberRole;
  const status = formData.get('status') as ActivityStatus;

  // Basic Validation
  if (!firstName || !lastName || !fdIdNumber || !cellPhone || !addressLine1 || !city) {
    return { message: 'Missing required fields' };
  }

  // Geocode Address
  const fullAddress = `${addressLine1}, ${city}, ${state} ${zipCode}`;
  const coords = await geocodeAddress(fullAddress);

  const data = {
    firstName,
    lastName,
    fdIdNumber,
    cellPhone,
    addressLine1,
    city,
    state,
    zipCode,
    role,
    status,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  };

  try {
    if (id) {
      // Update
      await prisma.member.update({
        where: { id },
        data,
      });
    } else {
      // Create
      await prisma.member.create({
        data: {
          ...data,
          // Default optional fields
          addressLine2: '',
          homePhone: '',
          isInShabbosSystem: false,
        },
      });
    }
  } catch (error) {
    console.error('Database Error:', error);
    return { message: 'Database Error: Failed to save member.' };
  }

  revalidatePath('/members');
  return { message: 'Success' };
}

export async function deleteMember(id: string) {
  try {
    await prisma.member.delete({ where: { id } });
    revalidatePath('/members');
  } catch (error) {
    console.error('Failed to delete member:', error);
    throw new Error('Failed to delete member');
  }
}
