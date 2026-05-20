#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const appModulePath = join(root, 'apps/api/src/app.module.ts');
const appShellPath = join(root, 'apps/web/components/AppShell.tsx');

const domains = [
  { key: 'heritage', module: 'HeritageBrainModule', page: 'apps/web/app/domains/heritage/page.tsx' },
  { key: 'destination', module: 'DestinationBrainModule', page: 'apps/web/app/domains/destination/page.tsx' },
  { key: 'mega-events', module: 'MegaEventsBrainModule', page: 'apps/web/app/domains/mega-events/page.tsx' },
  { key: 'culture-programs', module: 'CultureProgramsBrainModule', page: 'apps/web/app/domains/culture-programs/page.tsx' },
  { key: 'urban-experience', module: 'UrbanExperienceBrainModule', page: 'apps/web/app/domains/urban-experience/page.tsx' },
  { key: 'exhibition', module: 'ExhibitionBrainModule', page: 'apps/web/app/domains/exhibition/page.tsx' },
];

const appModule = existsSync(appModulePath) ? readFileSync(appModulePath, 'utf8') : '';
const appShell = existsSync(appShellPath) ? readFileSync(appShellPath, 'utf8') : '';

const report = domains.map((d) => ({
  domain: d.key,
  apiModuleWired: appModule.includes(d.module),
  pageExists: existsSync(join(root, d.page)),
  navMentioned: appShell.includes(d.key) || appShell.includes(d.page.split('/').slice(-2, -1)[0]),
}));

const ok = report.every((r) => r.apiModuleWired && r.pageExists);
console.log(JSON.stringify({ ok, report }, null, 2));
process.exit(ok ? 0 : 1);
