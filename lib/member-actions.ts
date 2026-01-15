'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
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
  if (!firstName || !lastName || !fdIdNumber || !cellPhone || !addressLine1 || !city || !state || !zipCode) {
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
    return { success: true };
  } catch (error) {
    console.error('Failed to delete member:', error);
    return { success: false, error: 'Failed to delete member' };
  }
}



// Schema for validation
const MemberSchema = z.object({
  firstName: z.string().min(1, 'First Name is required'),
  lastName: z.string().min(1, 'Last Name is required'),
  fdIdNumber: z.string().min(1, 'FD ID Number is required'),
  cellPhone: z.string().min(1, 'Cell Phone is required'),
  homePhone: z.string().optional().nullable(),
  addressLine1: z.string().min(1, 'Address Line 1 is required'),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'Zip Code is required'),
  role: z.enum(MemberRole).optional()  ,
  status: z.enum(ActivityStatus).optional(),
});

type MemberInput = z.infer<typeof MemberSchema>;

export async function getMembers() {
  try {
    const members = await prisma.member.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: members };
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return { success: false, error: 'Failed to fetch members' };
  }
}

export async function createMember(formData: unknown) {
  try {
    const validated = MemberSchema.parse(formData);

    await prisma.member.create({
      data: validated,
    });

    revalidatePath('/members');
    return { success: true };
  } catch (error) {
    console.error('Failed to create member:', error);
    return { success: false, error: 'Failed to create member' };
  }
}

export async function updateMember(id: string, data: unknown) {
  try {
    const validated = MemberSchema.parse(data);

    await prisma.member.update({
      where: { id },
      data: validated,
    });

    revalidatePath('/members');
    return { success: true };
  } catch (error) {
    console.error('Failed to update member:', error);
    return { success: false, error: 'Failed to update member' };
  }
}

// New Bulk Import Action
export async function bulkImportMembers(members: unknown[]) {
  try {
    // 1. Validate all records first
    const validMembers: MemberInput[] = [];
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < members.length; i++) {
      const result = MemberSchema.safeParse(members[i]);
      if (result.success) {
        validMembers.push(result.data);
      } else {
        errors.push({
          row: i + 1,
          // error: result.error.errors.map((e) => e.message).join(', '),
          error: result.error.message,
        });
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Validation failed for ${errors.length} rows`,
        details: errors,
      };
    }

    // 2. Insert into DB (skip duplicates based on unique constraints like email)
    // Prisma createMany skipDuplicates is efficient but doesn't return created records
    // We'll iterate to handle unique constraint errors gracefully if needed,
    // or use createMany if we want speed and just skip existing emails.

    // Using transaction for safety
    const result = await prisma.$transaction(async (tx) => {
        let createdCount = 0;
        let skippedCount = 0;

        for(const member of validMembers) {
            const existing = await tx.member.findUnique({
                where: { fdIdNumber: member.fdIdNumber }
            });

            if(!existing) {
                await tx.member.create({ data: member });
                createdCount++;
            } else {
                skippedCount++;
            }
        }
        return { createdCount, skippedCount };
    });

    revalidatePath('/members');
    return {
        success: true,
        message: `Imported ${result.createdCount} members. Skipped ${result.skippedCount} duplicates.`
    };

  } catch (error) {
    console.error('Bulk import error:', error);
    return { success: false, error: 'Failed to process import' };
  }
}
