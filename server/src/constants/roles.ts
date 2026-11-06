export enum UserRole {
  GUEST = 'guest',
  STAFF = 'staff',
  ADMIN = 'admin',
}

export const USER_ROLES = [UserRole.GUEST, UserRole.STAFF, UserRole.ADMIN] as const;

