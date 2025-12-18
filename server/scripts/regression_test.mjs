
import assert from 'assert';

const BASE_URL = 'http://localhost:3001/api';

async function test(name, fn) {
  try {
    process.stdout.write(`Testing ${name}... `);
    await fn();
    console.log('✅ PASS');
  } catch (e) {
    console.log('❌ FAIL');
    console.error(e);
    process.exit(1);
  }
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function run() {
  console.log('Starting Regression Test Suite...\n');

  // 1. System Check
  await test('GET /models', async () => {
    const res = await request('GET', '/models');
    assert.ok(res.providers, 'Should return providers');
    assert.ok(res.providers.wenxin, 'Should have wenxin');
    assert.ok(res.providers.qwen, 'Should have qwen');
  });

  // 2. Decode (Classification)
  let decodeResult;
  await test('POST /decode', async () => {
    const body = {
      product: '问界M9',
      seedKeyword: '安全',
      userQuery: '问界M9安全性怎么样'
    };
    const res = await request('POST', '/decode', body);
    assert.strictEqual(res.input.product, '问界M9');
    // We expect some category/channel to be determined
    // Note: Since LLM calls might be mocked or real, we check structure
    assert.ok(res.channel, 'Should return a channel (A-E)');
    assert.ok(res.persona, 'Should return persona object');
    decodeResult = res;
  });

  // 3. Mine Queries
  await test('POST /mine-queries', async () => {
    // We use the channel from decode if available, else default to 'A'
    const channel = decodeResult?.channel || 'A';
    const body = {
      product: '问界M9',
      seedKeyword: '安全',
      channel: channel,
      direct: true
    };
    const res = await request('POST', '/mine-queries', body);
    assert.ok(Array.isArray(res.list), 'Should return list of queries');
    // Note: Actual LLM might be slow or fail if not configured, 
    // but the backend structure should handle it or return empty list with no error 
    // or if we have mocked LLM responses.
    // If it relies on real LLM, this might take time.
  });

  // 4. Test Strategy
  await test('GET /test-strategy', async () => {
    const res = await request('GET', '/test-strategy?product=Test&seedKeyword=Test&channel=A&limit=2');
    assert.strictEqual(res.channel, 'A');
    assert.ok(Array.isArray(res.samples), 'Should return samples');
    assert.ok(res.samples.length > 0, 'Should have at least one sample');
  });

  // 5. Graph Structure
  await test('POST /graph', async () => {
    const body = {
      product: '问界M9',
      mined: [
        { query: '问界M9安全吗', angle: '安全性能', dimension: 'Safety' },
        { query: '问界M9价格', angle: '性价比', dimension: 'Price' }
      ]
    };
    const res = await request('POST', '/graph', body);
    assert.ok(Array.isArray(res.nodes), 'Should return nodes');
    assert.ok(Array.isArray(res.links), 'Should return links');
    // Verify specific nodes exist
    const hasProduct = res.nodes.some(n => n.type === 'Product' && n.label === '问界M9');
    assert.ok(hasProduct, 'Should contain Product node');
  });

  // 6. Report Creation (Mock run)
  await test('POST /report/create', async () => {
    const body = {
      queries: [{ query: 'Test Query' }],
      providers: ['qwen'],
      product: 'Test Product'
    };
    const res = await request('POST', '/report/create', body);
    assert.ok(res.id, 'Should return report ID');
  });

  // 7. Generate Content
  await test('POST /generate-content', async () => {
    const body = {
      prompt: '写一段关于AI的短文',
      channel: 'twitter'
    };
    const res = await request('POST', '/generate-content', body);
    assert.ok(typeof res.content === 'string', 'Should return content string');
  });

  console.log('\nAll regression tests passed! 🚀');
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
