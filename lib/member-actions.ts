'use server';

import { prisma } from '@/lib/prisma';
import { geocodeAddress } from './google-maps';
import { revalidatePath } from 'next/cache';
import { MemberRole, ActivityStatus } from '@/generated/client';

export type MemberFormState = {
  message?: string;
  errors?: Record<string, string[]>;
};

// New helper for the client form to get suggested coordinates
export async function getMemberCoordinates(address: string) {
  return await geocodeAddress(address);
}

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
  const addressLine2 = formData.get('addressLine2') as string;
  const city = formData.get('city') as string;
  const state = formData.get('state') as string;
  const zipCode = formData.get('zipCode') as string;
  const role = formData.get('role') as MemberRole;
  const status = formData.get('status') as ActivityStatus;
  const qualificationsInput = formData.get('qualifications') as string;

  // Manual coordinates from the map picker
  const latInput = formData.get('lat');
  const lngInput = formData.get('lng');

  // Basic Validation
  if (!firstName || !lastName || !fdIdNumber || !cellPhone || !addressLine1 || !city) {
    return { message: 'Missing required fields' };
  }

  // Parse Qualifications
  const qualNames = qualificationsInput
    ? qualificationsInput.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : [];

  // Determine Coordinates
  let lat: number | null = latInput ? parseFloat(latInput.toString()) : null;
  let lng: number | null = lngInput ? parseFloat(lngInput.toString()) : null;

  // Fallback to server-side geocoding if user didn't verify/adjust map
  if (lat === null || lng === null) {
    const fullAddress = `${addressLine1}, ${city}, ${state} ${zipCode}`;
    const coords = await geocodeAddress(fullAddress);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  const baseData = {
    firstName,
    lastName,
    fdIdNumber,
    cellPhone,
    addressLine1,
    addressLine2,
    city,
    state,
    zipCode,
    role,
    status,
    lat,
    lng,
  };

  try {
    if (id) {
      // Update
      await prisma.member.update({
        where: { id },
        data: {
          qualifications: {
            set: [],
          },
        },
      });

      await prisma.member.update({
        where: { id },
        data: {
          ...baseData,
          qualifications: {
            connectOrCreate: qualNames.map((name) => ({
              where: { name },
              create: { name },
            })),
          },
        },
      });
    } else {
      // Create
      await prisma.member.create({
        data: {
          ...baseData,
          homePhone: '',
          isInShabbosSystem: false,
          qualifications: {
            connectOrCreate: qualNames.map((name) => ({
              where: { name },
              create: { name },
            })),
          },
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
