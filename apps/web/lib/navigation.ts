export type NavigationItem = {
  href: string;
  label: string;
  description?: string;
};

export type NavigationSection = {
  key: string;
  label: string;
  description: string;
  items: NavigationItem[];
};

export const PLATFORM_NAVIGATION: NavigationSection[] = [
  {
    key: 'core',
    label: 'نواة التشغيل',
    description: 'الجهات، المشاريع، البرامج، المحتوى، والمرفقات.',
    items: [
      { href: '/', label: 'الرئيسية' },
      { href: '/projects', label: 'المشاريع' },
      { href: '/content', label: 'المحتوى' },
      { href: '/experiences', label: 'التجارب' },
      { href: '/attachments', label: 'المرفقات' },
      { href: '/program-templates', label: 'قوالب البرامج' },
      { href: '/workflows', label: 'سير العمل' },
      { href: '/studio', label: 'الاستوديو' },
    ],
  },
  {
    key: 'heritage',
    label: 'التراث والزائر',
    description: 'الأصول التراثية، السرد، النشر العام، وتجربة الزائر.',
    items: [
      { href: '/heritage-memory', label: 'ذاكرة التراث' },
      { href: '/iiif', label: 'IIIF' },
      { href: '/visitor-guide', label: 'مرشد الزائر' },
      { href: '/stories', label: 'القصص' },
      { href: '/culture', label: 'الثقافة السعودية' },
      { href: '/content-credentials', label: 'بصمة المحتوى' },
      { href: '/research', label: 'الأبحاث' },
    ],
  },
  {
    key: 'governance',
    label: 'الحوكمة والمراجعة',
    description: 'الموافقات، الأدلة، الامتثال، والمخاطر.',
    items: [
      { href: '/approvals', label: 'الموافقات' },
      { href: '/approval-packets', label: 'حزم الاعتماد' },
      { href: '/documentation', label: 'التوثيق' },
      { href: '/risks', label: 'المخاطر' },
      { href: '/compliance', label: 'الامتثال' },
      { href: '/quality', label: 'الجودة' },
      { href: '/audit-logs', label: 'سجل التدقيق' },
    ],
  },
  {
    key: 'intelligence',
    label: 'المعرفة والذكاء',
    description: 'طبقات المعرفة والاسترجاع والذكاء القطاعي.',
    items: [
      { href: '/ai', label: 'الذكاء الاصطناعي' },
      { href: '/knowledge-packs', label: 'حزم المعرفة' },
      { href: '/knowledge-spine', label: 'Knowledge Spine' },
      { href: '/official', label: 'المصادر الرسمية' },
      { href: '/radar', label: 'الرادار' },
      { href: '/competitions', label: 'المنافسات' },
      { href: '/twinspec', label: 'TwinSpec' },
    ],
  },
  {
    key: 'operations',
    label: 'التشغيل والرصد',
    description: 'الصحة التشغيلية، الحوادث، والتوأم والقياس.',
    items: [
      { href: '/analytics', label: 'التحليلات' },
      { href: '/impact', label: 'الأثر' },
      { href: '/notifications', label: 'التنبيهات' },
      { href: '/ops', label: 'التشغيل' },
      { href: '/observability', label: 'الرصد التشغيلي' },
      { href: '/iot', label: 'IoT' },
      { href: '/twin', label: 'التوأم الرقمي' },
    ],
  },
  {
    key: 'admin',
    label: 'الإدارة والمنصة',
    description: 'المستخدمون والهوية والإعدادات المرتبطة بالنظام.',
    items: [
      { href: '/users', label: 'المستخدمون' },
      { href: '/vault', label: 'Vault' },
      { href: '/inspiration', label: 'الإلهام' },
      { href: '/ideation', label: 'العصف الذهني' },
      { href: '/experiments', label: 'التجارب A/B' },
      { href: '/login', label: 'الجلسة' },
    ],
  },
];

export function isItemActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
