'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { hash } from 'bcryptjs';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const userId = session.user.id;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // Member fields
  const addressLine1 = formData.get('addressLine1') as string;
  const addressLine2 = formData.get('addressLine2') as string;
  const city = formData.get('city') as string;
  const state = formData.get('state') as string;
  const zipCode = formData.get('zipCode') as string;
  const cellPhone = formData.get('cellPhone') as string;

  try {
    // 1. Update User Password if provided
    if (password) {
      if (password !== confirmPassword) {
        return { success: false, error: 'Passwords do not match' };
      }
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      const hashedPassword = await hash(password, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      });
    }

    // 2. Update Linked Member details if user is linked
    // First, find the user to check for memberId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { memberId: true },
    });

    if (user && user.memberId) {
        // Geocode the address if it changed (simplified for now, ideally use the google-maps lib here if available)
        // For this implementation we will just update the text fields.
        // If lat/lng update is needed based on address change, we should call the geocoding service here.

        await prisma.member.update({
            where: { id: user.memberId },
            data: {
                addressLine1,
                addressLine2,
                city,
                state,
                zipCode,
                cellPhone
            }
        });
    }

    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    console.error('Failed to update profile:', error);
    return { success: false, error: 'Failed to update profile' };
  }
}
