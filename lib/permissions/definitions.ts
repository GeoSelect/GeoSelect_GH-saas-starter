/**
 * Permission Definitions
 * 
 * Defines all permissions and role-to-permission mappings.
 * Supports hierarchical permission model.
 */

/**
 * Available permissions in the system
 */
export const PERMISSIONS = {
  // Report permissions
  READ_REPORTS: 'READ_REPORTS',
  WRITE_REPORTS: 'WRITE_REPORTS',
  DELETE_REPORTS: 'DELETE_REPORTS',
  PUBLISH_REPORTS: 'PUBLISH_REPORTS',
  
  // Location permissions
  READ_LOCATIONS: 'READ_LOCATIONS',
  WRITE_LOCATIONS: 'WRITE_LOCATIONS',
  DELETE_LOCATIONS: 'DELETE_LOCATIONS',
  
  // Team/Account permissions
  MANAGE_TEAM: 'MANAGE_TEAM',
  INVITE_MEMBERS: 'INVITE_MEMBERS',
  REMOVE_MEMBERS: 'REMOVE_MEMBERS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  
  // Billing permissions
  VIEW_BILLING: 'VIEW_BILLING',
  MANAGE_BILLING: 'MANAGE_BILLING',
  MANAGE_SUBSCRIPTION: 'MANAGE_SUBSCRIPTION',
  
  // Settings permissions
  VIEW_SETTINGS: 'VIEW_SETTINGS',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  MANAGE_INTEGRATIONS: 'MANAGE_INTEGRATIONS',
  
  // API permissions
  USE_API: 'USE_API',
  MANAGE_API_KEYS: 'MANAGE_API_KEYS',
  
  // Data permissions
  EXPORT_DATA: 'EXPORT_DATA',
  IMPORT_DATA: 'IMPORT_DATA',
  DELETE_DATA: 'DELETE_DATA',
  
  // Audit permissions
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Available roles in the system
 */
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Role-to-permission mapping
 * Each role inherits permissions from roles below it
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    // Owners have all permissions
    PERMISSIONS.READ_REPORTS,
    PERMISSIONS.WRITE_REPORTS,
    PERMISSIONS.DELETE_REPORTS,
    PERMISSIONS.PUBLISH_REPORTS,
    PERMISSIONS.READ_LOCATIONS,
    PERMISSIONS.WRITE_LOCATIONS,
    PERMISSIONS.DELETE_LOCATIONS,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.VIEW_BILLING,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.MANAGE_SUBSCRIPTION,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.USE_API,
    PERMISSIONS.MANAGE_API_KEYS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.DELETE_DATA,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  admin: [
    // Admins can do most things except manage billing and delete account
    PERMISSIONS.READ_REPORTS,
    PERMISSIONS.WRITE_REPORTS,
    PERMISSIONS.DELETE_REPORTS,
    PERMISSIONS.PUBLISH_REPORTS,
    PERMISSIONS.READ_LOCATIONS,
    PERMISSIONS.WRITE_LOCATIONS,
    PERMISSIONS.DELETE_LOCATIONS,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.VIEW_BILLING,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.USE_API,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  member: [
    // Members can read and write content
    PERMISSIONS.READ_REPORTS,
    PERMISSIONS.WRITE_REPORTS,
    PERMISSIONS.READ_LOCATIONS,
    PERMISSIONS.WRITE_LOCATIONS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.USE_API,
    PERMISSIONS.EXPORT_DATA,
  ],
  viewer: [
    // Viewers can only read
    PERMISSIONS.READ_REPORTS,
    PERMISSIONS.READ_LOCATIONS,
    PERMISSIONS.VIEW_SETTINGS,
  ],
};

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Get all roles
 */
export function getAllRoles(): Role[] {
  return Object.values(ROLES);
}

/**
 * Get all permissions
 */
export function getAllPermissions(): Permission[] {
  return Object.values(PERMISSIONS);
}

/**
 * Check if a role is valid
 */
export function isValidRole(role: string): role is Role {
  return Object.values(ROLES).includes(role as Role);
}

/**
 * Role hierarchy (for inheritance and comparisons)
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 100,
  admin: 75,
  member: 50,
  viewer: 25,
};

/**
 * Check if roleA has at least as much access as roleB
 */
export function roleHasAtLeastAccess(roleA: Role, roleB: Role): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}
