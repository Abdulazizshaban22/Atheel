import { PrismaClient } from '@prisma/client';
import { createHash, scryptSync } from 'node:crypto';
import { SAUDI_REGIONS, CULTURE_THEMES, MOC_CULTURAL_SECTORS } from '@madar/culture-sa-kernel';

const prisma = new PrismaClient();

type SeedProfile = 'baseline' | 'demo';

function seedProfile(): SeedProfile {
  const raw = String(process.env.SEED_PROFILE || 'baseline').trim().toLowerCase();
  return raw === 'demo' ? 'demo' : 'baseline';
}

function hashPassword(password: string) {
  const salt = 'atheel_demo_salt';
  const digest = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${digest}`;
}

function hashRefresh(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function seedBaseline() {
  const org = await prisma.organization.upsert({
    where: { id: 'org_demo_1' },
    update: {},
    create: {
      id: 'org_demo_1',
      nameAr: 'الجهة المرجعية الأساسية',
      nameEn: 'Atheel Baseline Organization',
      sector: 'government',
      city: 'الرياض',
      country: 'SA',
    },
  });

  const project = await prisma.project.upsert({
    where: { id: 'prj_1' },
    update: {},
    create: {
      id: 'prj_1',
      organizationId: org.id,
      code: 'ATH-001',
      nameAr: 'المشروع المرجعي الأساسي',
      status: 'planning',
      progressPercent: 15,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-06-30'),
    },
  });

  const nodes: Array<{ code: string; labelAr: string; kind: string; parentCode?: string | null; tags: string[] }> = [
    { code: 'root', labelAr: 'تصنيف الثقافة السعودية', kind: 'root', parentCode: null, tags: ['sa', 'culture'] },
    { code: 'themes', labelAr: 'المجالات والموضوعات', kind: 'group', parentCode: 'root', tags: ['themes'] },
    { code: 'sectors', labelAr: 'القطاعات الثقافية', kind: 'group', parentCode: 'root', tags: ['sectors', 'moc'] },
    { code: 'regions', labelAr: 'المناطق', kind: 'group', parentCode: 'root', tags: ['regions'] },
  ];

  for (const t of CULTURE_THEMES) nodes.push({ code: `theme:${t.code}`, labelAr: t.nameAr, kind: 'theme', parentCode: 'themes', tags: ['theme', t.code, ...(t.keywordsAr || []).slice(0, 6)] });
  for (const s of MOC_CULTURAL_SECTORS) nodes.push({ code: `sector:${s.code}`, labelAr: s.nameAr, kind: 'sector', parentCode: 'sectors', tags: ['sector', s.code, ...(s.keywords || []).slice(0, 8)] });
  for (const r of SAUDI_REGIONS) nodes.push({ code: `region:${r.code}`, labelAr: r.nameAr, kind: 'region', parentCode: 'regions', tags: ['region', r.code, ...(r.hubs || []).slice(0, 6)] });

  for (const n of nodes) {
    await prisma.culturalTaxonomyNode.upsert({
      where: { organizationId_code: { organizationId: org.id, code: n.code } },
      update: { labelAr: n.labelAr, kind: n.kind, parentCode: n.parentCode || null, tags: n.tags },
      create: { organizationId: org.id, code: n.code, labelAr: n.labelAr, kind: n.kind, parentCode: n.parentCode || null, tags: n.tags },
    });
  }

  await prisma.contentItem.upsert({
    where: { id: 'cnt_1' },
    update: {},
    create: {
      id: 'cnt_1',
      organizationId: org.id,
      projectId: project.id,
      title: 'محتوى مرجعي أساسي',
      languageCode: 'ar',
      contentType: 'article',
      status: 'draft',
      summary: 'سجل أساسي لاختبار Prisma-only core CRUD.',
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      action: 'seed.baseline.initialize',
      severity: 'info',
      message: 'تهيئة بيانات baseline لأثيل',
      after: { profile: 'baseline', refreshSeedHash: hashRefresh('baseline_seed_refresh') },
    },
  }).catch(() => void 0);

  return { org, project };
}

async function seedDemo(orgId: string, projectId: string) {
  const users = [
    { id: 'usr_super_1', email: 'admin@atheel.sa', displayName: 'مدير المنصة', password: 'Admin@1234', roles: ['super_admin', 'org_admin', 'analyst'] as const },
    { id: 'usr_editor_1', email: 'editor@atheel.sa', displayName: 'محرر محتوى ثقافي', password: 'Editor@1234', roles: ['content_editor', 'curator', 'viewer'] as const },
    { id: 'usr_pm_1', email: 'pm@atheel.sa', displayName: 'مدير مشروع ثقافي', password: 'Pm@1234', roles: ['project_manager', 'experience_designer', 'viewer'] as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { displayName: u.displayName, passwordHash: hashPassword(u.password), isActive: true },
      create: { id: u.id, email: u.email, displayName: u.displayName, passwordHash: hashPassword(u.password), isActive: true },
    });
    for (const role of u.roles) {
      await prisma.organizationMember.upsert({
        where: { userId_organizationId_role: { userId: u.id, organizationId: orgId, role } },
        update: {},
        create: { userId: u.id, organizationId: orgId, role },
      });
    }
  }

  const starterResearch = [
    {
      title: 'Riyadh Season وتأثيره على صورة الوجهة',
      degree: 'thesis',
      year: 2024,
      sourceUrl: 'https://drepo.sdl.edu.sa/communities/5f071cac-8e45-4e6c-ae98-48caac89b2e5?f.subject=Riyadh+Season%2Cequals&spc.page=1',
    },
    {
      title: 'دوافع حضور مهرجان غذائي في السعودية (Push/Pull)',
      degree: 'thesis',
      year: 2023,
      sourceUrl: 'https://drepo.sdl.edu.sa/items/835bc3f6-bb2b-4755-8e9a-10d5f8d18d31/full',
    },
  ];

  for (const d of starterResearch) {
    await prisma.researchDocument.create({
      data: {
        organizationId: orgId,
        projectId,
        title: d.title,
        university: null,
        degree: d.degree,
        year: d.year,
        authors: null,
        sourceUrl: d.sourceUrl,
        abstractAr: null,
        fullTextAr: null,
        metaJson: { seeded: true, profile: 'demo' },
      },
    }).catch(() => void 0);
  }

  await prisma.visitorExperience.upsert({
    where: { id: 'exp_1' },
    update: {},
    create: { id: 'exp_1', projectId, titleAr: 'جولة الحي', experienceType: 'route', durationMinutesDefault: 45, publishStatus: 'draft' },
  });

  await prisma.approvalRequest.upsert({
    where: { id: 'apr_1' },
    update: {},
    create: {
      id: 'apr_1',
      organizationId: orgId,
      entityType: 'content',
      entityId: 'cnt_1',
      title: 'اعتماد نص تعريفي',
      status: 'submitted',
      submittedByUserId: 'usr_editor_1',
      submittedAt: new Date(),
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      actorUserId: 'usr_super_1',
      action: 'seed.demo.initialize',
      severity: 'info',
      message: 'تهيئة بيانات demo لأثيل',
      after: { profile: 'demo', refreshSeedHash: hashRefresh('demo_seed_refresh') },
    },
  }).catch(() => void 0);
}

async function main() {
  const profile = seedProfile();
  const { org, project } = await seedBaseline();
  if (profile === 'demo') {
    await seedDemo(org.id, project.id);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
