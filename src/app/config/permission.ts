// src/config/permissions.ts
// NOTE: These values are checked against session.user.membership (billing tier)
// in middleware.ts for route-level access control.
// Membership values: "basic" | "premium" | "pro" | "trainer"
// For API-level admin auth, see requireAdminAuth() which checks userProfile.role.
export const permissions = {
  admin: ['trainer'],
  dashboard: ['basic', 'premium', 'pro', 'trainer'],
  onboarding: ['basic', 'premium', 'pro', 'trainer'],
  profile: ['basic', 'premium', 'pro', 'trainer'],
  'chat-with-rivo': ['basic', 'premium', 'pro', 'trainer'],
  pantry: ['basic', 'premium', 'pro', 'trainer'],
};

export function hasAccess(route: string, role: string) {
  for (const [key, allowedRoles] of Object.entries(permissions)) {
    if (route.startsWith(`/${key}`)) {
      return allowedRoles.includes(role);
    }
  }
  return false; // default deny
}