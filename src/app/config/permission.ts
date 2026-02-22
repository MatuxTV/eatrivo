// src/config/permissions.ts
export const permissions = {
  admin: ['trainer'],
  dashboard: ['user', 'trainer'],
  onboarding: ['user', 'trainer'],
  profile: ['user', 'trainer'],
  'chat-with-rivo': ['user', 'trainer'],
  pantry: ['user', 'trainer'],
};

export function hasAccess(route: string, role: string) {
  for (const [key, allowedRoles] of Object.entries(permissions)) {
    if (route.startsWith(`/${key}`)) {
      return allowedRoles.includes(role);
    }
  }
  return false; // default deny
}