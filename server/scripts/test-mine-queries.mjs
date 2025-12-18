// Simple E2E tests for /api/mine-queries
// Usage: node server/scripts/test-mine-queries.mjs

async function post(path, body) {
  const r = await fetch(`http://localhost:3001${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: r.status, json };
}

function logCase(name, res) {
  console.log(`\n[Case] ${name} -> status=${res.status}`);
  console.log(JSON.stringify(res.json, null, 2));
}

async function run() {
  // Case 1: Normal brand/category via LLM
  const c1 = await post('/api/mine-queries', {
    product: 'iPhone 16',
    brand: 'iPhone 16',
    seedKeyword: '续航',
    channel: 'B',
    signals: {},
    direct: true,
  });
  logCase('normal', c1);
  if (c1.status !== 200 || !Array.isArray(c1.json?.list)) process.exitCode = 1;

  // Case 2: Missing brand/product -> expect 400
  const c2 = await post('/api/mine-queries', {
    product: '',
    brand: '',
    seedKeyword: '测试',
    channel: 'A',
    signals: {},
    direct: true,
  });
  logCase('missing_brand', c2);
  if (c2.status !== 400 || !String(c2.json?.error || '').includes('missing_brand_or_product')) process.exitCode = 1;

  // Case 3: Invalid category param provided (ignored, but should not break)
  const c3 = await post('/api/mine-queries', {
    product: '畅利泰药品',
    brand: '畅利泰药品',
    seedKeyword: '肠胃不舒服',
    channel: 'C',
    signals: {},
    direct: true,
    category: 12345,
  });
  logCase('invalid_category_param', c3);
  if (c3.status !== 200 || !Array.isArray(c3.json?.list)) process.exitCode = 1;
}

run().catch((e) => {
  console.error('Test run failed', e);
  process.exit(1);
});

