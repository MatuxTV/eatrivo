// src/config/permissions.ts
// NOTE: These values are checked against session.user.membership (billing tier)
// in middleware.ts for route-level access control.
// Membership values: "basic" | "premium" | "pro" | "trainer"
// For API-level admin auth, see requireAdminAuth() which checks userProfile.role.
export const permissions = {
  admin: ['basic', 'premium', 'pro', 'trainer'],
  home: ['basic', 'premium', 'pro', 'trainer'],
  onboarding: ['basic', 'premium', 'pro', 'trainer'],
  profile: ['basic', 'premium', 'pro', 'trainer'],
  'chat-with-rivo': ['basic', 'premium', 'pro', 'trainer'],
  pantry: ['basic', 'premium', 'pro', 'trainer'],
};

// Admin routes are restricted to the dedicated admin role from userProfiles.role.
const ADMIN_ROLES: string[] = ['admin'];

export function hasAccess(route: string, role: string) {
  for (const [key, allowedRoles] of Object.entries(permissions)) {
    if (route.startsWith(`/${key}`)) {
      return allowedRoles.includes(role);
    }
  }
  return false; // default deny
}

/**
 * Check if user has admin-level role.
 * Uses userProfile.role, NOT membership tier.
 */
export function hasAdminRole(role: string | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}