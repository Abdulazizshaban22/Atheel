const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
const checks = [
  { name: 'health', path: '/health' },
  { name: 'destination brain summary', path: '/programs/destination-brain/summary' },
  { name: 'stage gate templates', path: '/governance/stage-gates/templates' },
  { name: 'impact project sample', path: '/impact/projects/demo-project' },
];

async function run() {
  const results = [];
  for (const check of checks) {
    const url = `${baseUrl}${check.path}`;
    try {
      const response = await fetch(url, {
        headers: process.env.API_BEARER_TOKEN
          ? { Authorization: `Bearer ${process.env.API_BEARER_TOKEN}` }
          : {},
      });
      results.push({
        name: check.name,
        url,
        status: response.status,
        ok: response.ok,
      });
    } catch (error) {
      results.push({
        name: check.name,
        url,
        status: 'NETWORK_ERROR',
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.table(results);
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`Smoke checks failed: ${failed.map((f) => f.name).join(', ')}`);
    process.exit(1);
  }
  console.log('All smoke checks passed.');
}

run();
