// Frontend type definitions mirroring Prisma schema where needed
// This ensures strict typing across components without bundling Prisma client

export enum ActivityStatus {
  LOW = 'LOW',
  REGULAR = 'REGULAR',
}

export enum MemberRole {
  CHIEF = 'CHIEF',
  ASSISTANT_CHIEF = 'ASSISTANT_CHIEF',
  DEPUTY_CHIEF = 'DEPUTY_CHIEF',
  FULL_MEMBER = 'FULL_MEMBER',
  PROBATIONARY = 'PROBATIONARY',
  LIFE = 'LIFE',
  DUTY_CREW = 'DUTY_CREW',
}

export interface AdminUserView {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  approvedBy?: { email: string } | null;
};

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
  NONE = 'NONE',
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  fdIdNumber: string;
  cellPhone: string;
  addressLine1: string;
  addressLine2?: string | null; // Added Address Line 2
  city: string;
  state: string;
  zipCode: string;
  location: GeoLocation; // Derived from lat/lng in DB
  status: ActivityStatus;
  role: MemberRole;
  qualifications: string[];
  lat?: number;
  lng?: number;
}
