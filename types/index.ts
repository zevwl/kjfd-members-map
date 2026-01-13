// Frontend type definitions mirroring Prisma schema where needed
// This ensures strict typing across components

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
  city: string;
  state: string;
  location: GeoLocation; // Derived from lat/lng in DB
  status: ActivityStatus;
  role: MemberRole;
  qualifications: string[];
}
