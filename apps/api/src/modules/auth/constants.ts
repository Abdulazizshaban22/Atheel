export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

export type PlatformRole =
  | 'super_admin'
  | 'org_admin'
  | 'project_manager'
  | 'curator'
  | 'content_editor'
  | 'experience_designer'
  | 'analyst'
  | 'viewer';
