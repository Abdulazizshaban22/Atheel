export const DOMAIN_TAXONOMIES = [
  'heritage',
  'destination',
  'mega_events',
  'exhibition',
  'culture_programs',
  'urban_experience',
] as const;

export type AtheelDomain = typeof DOMAIN_TAXONOMIES[number];
