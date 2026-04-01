/**
 * Role-Based Access Control
 * 
 * Utilities for role-based UI hiding and permission checks.
 */

export type Role = 'super_admin' | 'admin' | 'operator' | 'readonly_observer';

export const roleHierarchy: Record<Role, number> = {
  super_admin: 4,
  admin: 3,
  operator: 2,
  readonly_observer: 1,
};

export const roleLabels: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  operator: 'Operator',
  readonly_observer: 'Viewer',
};

/**
 * Check if user has minimum role level
 */
export function hasRole(userRole: string | null, minRole: Role): boolean {
  if (!userRole) return false;
  
  const userLevel = roleHierarchy[userRole as Role] ?? 0;
  const requiredLevel = roleHierarchy[minRole];
  
  return userLevel >= requiredLevel;
}

/**
 * Permission definitions for dashboard features
 */
export const permissions = {
  // Dashboard
  view_dashboard: ['super_admin', 'admin', 'operator', 'readonly_observer'] as Role[],
  
  // Products
  view_products: ['super_admin', 'admin', 'operator', 'readonly_observer'] as Role[],
  edit_products: ['super_admin', 'admin', 'operator'] as Role[],
  
  // Crawl Jobs
  view_crawl_jobs: ['super_admin', 'admin', 'operator', 'readonly_observer'] as Role[],
  run_crawl_jobs: ['super_admin', 'admin', 'operator'] as Role[],
  
  // Publish Jobs
  view_publish_jobs: ['super_admin', 'admin', 'operator', 'readonly_observer'] as Role[],
  run_publish_jobs: ['super_admin', 'admin', 'operator'] as Role[],
  retry_publish_jobs: ['super_admin', 'admin'] as Role[],
  
  // AI Content
  view_ai_content: ['super_admin', 'admin', 'operator', 'readonly_observer'] as Role[],
  edit_ai_content: ['super_admin', 'admin', 'operator'] as Role[],
  regenerate_ai_content: ['super_admin', 'admin'] as Role[],

  // Blog
  view_blog_posts: ['super_admin', 'admin', 'operator', 'readonly_observer'] as Role[],
  edit_blog_posts: ['super_admin', 'admin', 'operator'] as Role[],
  delete_blog_posts: ['super_admin', 'admin'] as Role[],
  
  // Dead Letters
  view_dead_letters: ['super_admin', 'admin', 'operator'] as Role[],
  retry_dead_letters: ['super_admin', 'admin'] as Role[],
  delete_dead_letters: ['super_admin'] as Role[],
  
  // Workers
  view_workers: ['super_admin', 'admin', 'operator', 'readonly_observer'] as Role[],
  control_workers: ['super_admin', 'admin'] as Role[],
  
  // Settings (if exists)
  view_settings: ['super_admin', 'admin'] as Role[],
  edit_settings: ['super_admin'] as Role[],
};

/**
 * Check if role has permission
 */
export function hasPermission(role: string | null, permission: keyof typeof permissions): boolean {
  if (!role) return false;
  return permissions[permission].includes(role as Role);
}

/**
 * Get accessible routes for role
 */
export function getAccessibleRoutes(role: string | null): string[] {
  const routes: string[] = ['/admin'];
  
  if (!role) return routes;
  
  // Everyone can see dashboard
  routes.push('/admin/dashboard');
  
  // Role-based routes
  if (hasPermission(role, 'view_products')) routes.push('/admin/products');
  if (hasPermission(role, 'view_crawl_jobs')) routes.push('/admin/jobs/crawl');
  if (hasPermission(role, 'view_publish_jobs')) routes.push('/admin/jobs/publish');
  if (hasPermission(role, 'view_ai_content')) routes.push('/admin/ai-content');
  if (hasPermission(role, 'view_blog_posts')) routes.push('/admin/blog');
  if (hasPermission(role, 'view_dead_letters')) routes.push('/admin/dead-letters');
  if (hasPermission(role, 'view_workers')) routes.push('/admin/workers');
  if (hasPermission(role, 'view_settings')) routes.push('/admin/settings');
  
  return routes;
}
