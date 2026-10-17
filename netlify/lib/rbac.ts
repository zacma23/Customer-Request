import { Role } from '@prisma/client';
import { AuthUser } from './types';

export function isStaffOrAdmin(role: Role): boolean {
  return role === Role.STAFF || role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

export function isAdminOrSuperAdmin(role: Role): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

export function isSuperAdmin(role: Role): boolean {
  return role === Role.SUPER_ADMIN;
}

export function hasRole(user: AuthUser | null, allowedRoles: Role[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Checks whether the user is authorized to view or modify a request:
 * - CLIENT: only their own requests (ownerId matches)
 * - STAFF: assigned requests or all requests
 * - ADMIN / SUPER_ADMIN: full access
 */
export function canAccessRequest(user: AuthUser, clientId: string, assignedStaffId?: string | null): boolean {
  if (user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN) {
    return true;
  }
  if (user.role === Role.STAFF) {
    return true; // Staff can review requests queue
  }
  return user.id === clientId;
}
