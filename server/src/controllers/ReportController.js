import { EvalQueriesSchema, ReportCreateSchema, AnalyzeSourcesSchema } from '../schemas/index.js';
import { uid, extractDomains } from '../utils/common.js';
import { chat } from '../qwen.js';
import { PROVIDERS } from '../llm/providers.js';
import { callWenxinDetailed, callQwenDeepResearchDetailed } from '../llm/index.js';
import { startLog, endLog } from '../monitor.js';
import { getTask, setTask } from '../services/reportService.js';

/**
 * 评估查询词
 * 使用多个LLM提供商评估查询词
 */
export async function evalQueries(req, res) {
  const { queries, providers } = EvalQueriesSchema.parse(req.body);
  const results = [];
  for (const q of queries) {
    for (const p of providers) {
      try {
        const content = await chat([
          { role: 'system', content: '你是GEO评测助手，给出详细反馈。' },
          { role: 'user', content: String(q.query || '') },
        ], { provider: p, op: 'eval_query', query: String(q.query || ''), model: (PROVIDERS[p] && typeof PROVIDERS[p].model === 'function') ? PROVIDERS[p].model() : undefined });
        results.push({ ...q, provider: p, response: content, success: true });
      } catch (e) {
        results.push({ ...q, provider: p, response: '', success: false });
      }
    }
  }
  res.json({ results });
}

/**
 * 创建报告任务
 * 初始化后台任务来生成详细报告
 */
export async function createReport(req, res) {
  const { queries, providers, product, brand, seedKeyword, sellingPoints } = ReportCreateSchema.parse(req.body);
  const id = uid();
  const input = {
    product: String(product || ''),
    brand: String(brand || ''),
    seedKeyword: String(seedKeyword || ''),
    sellingPoints: String(sellingPoints || ''),
  };
  const total = Math.max(1, queries.length * Math.max(1, providers.length));
  // 初始化任务状态
  const state = { id, input, providers, queries, results: [], progress: { done: 0, total, percent: 0 }, status: 'running', createdAt: new Date().toISOString() };
  setTask(id, state);
  
  // 异步执行评估任务
  (async () => {
    const tasks = [];
    for (const q of queries) {
      for (const p of providers) {
        tasks.push((async () => {
          try {
            const content = await chat([
              { role: 'system', content: '你是GEO评测助手，给出详细反馈。' },
              { role: 'user', content: String(q.query || '') },
            ], { provider: p, op: 'eval_query', query: String(q.query || ''), model: (PROVIDERS[p] && typeof PROVIDERS[p].model === 'function') ? PROVIDERS[p].model() : undefined });
            state.results.push({ ...q, provider: p, response: content, success: true });
          } catch (e) {
            state.results.push({ ...q, provider: p, response: '', success: false, error: String(e) });
          } finally {
            state.progress.done += 1;
            state.progress.percent = state.progress.total ? Math.round(state.progress.done / state.progress.total * 100) : 100;
          }
        })());
      }
    }
    await Promise.allSettled(tasks);
    state.status = 'completed';
  })();
  res.json({ id });
}

/**
 * 获取报告状态
 */
export async function getReportStatus(req, res) {
  const id = String(req.query.id || '');
  const state = getTask(id);
  if (!state) return res.status(404).json({ error: 'not_found' });
  res.json({ id, progress: state.progress, status: state.status });
}

/**
 * 查看报告详情
 */
export async function viewReport(req, res) {
  const id = String(req.query.id || '');
  const state = getTask(id);
  if (!state) return res.status(404).json({ error: 'not_found' });
  res.json({ id, input: state.input, queries: state.queries, providers: state.providers, results: state.results, progress: state.progress, status: state.status });
}

/**
 * 分析来源
 * 分析搜索结果中的来源域名分布
 */
export async function analyzeSources(req, res) {
  const { queries, providers } = AnalyzeSourcesSchema.parse(req.body);
  const items = [];
  const counts = new Map();
  const tasks = [];
    for (const q of queries) {
      for (const p of providers) {
        tasks.push((async () => {
          const queryText = String(q.query || '');
          if (p === 'wenxin') {
            // 处理文心一言的来源分析
            let logId;
            try {
              const cfg = PROVIDERS['wenxin'];
              const apiKey = cfg.apiKey();
              const model = typeof cfg.model === 'function' ? cfg.model() : cfg.model;
              logId = startLog({ platform: p, model, operation: 'analyze_sources', query: queryText, prompt: '你是GEO引用分析助手，返回简洁回答。', baseURL: cfg.baseURL() });
              const { answer, sources } = await callWenxinDetailed(apiKey, model, '你是GEO引用分析助手，返回简洁回答。', queryText);
              const domains = Array.from(new Set((sources || []).map((s) => {
                try { return new URL(s.uri).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
              }).filter(Boolean)));
              for (const d of domains) counts.set(d, (counts.get(d) || 0) + 1);
              items.push({ query: queryText, provider: p, answer, sources, domains });
              endLog(logId, { success: true, response: JSON.stringify({ answer, sources, domains }) });
            } catch (e) {
              items.push({ query: queryText, provider: p, error: String(e), answer: '', sources: [], domains: [] });
              try { if (logId) endLog(logId, { success: false, error: e }); } catch {}
            }
          } else if (p === 'qwen' && (process.env.QWEN_MODEL === 'qwen-deep-research' || process.env.QWEN_USE_DEEP_RESEARCH === '1')) {
            // 处理通义千问深度搜索的来源分析
            let logId;
            try {
              const apiKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
              const messages = [
                { role: 'system', content: '你是GEO引用分析助手，返回简洁回答。' },
                { role: 'user', content: queryText },
              ];
              logId = startLog({ platform: p, model: 'qwen-deep-research', operation: 'analyze_sources', query: queryText, prompt: JSON.stringify(messages), baseURL: 'https://dashscope.aliyuncs.com' });
              const { answer, sources } = await callQwenDeepResearchDetailed(apiKey, messages);
              const domains = Array.from(new Set((sources || []).map((s) => {
                try { return new URL(s.uri).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
              }).filter(Boolean)));
              for (const d of domains) counts.set(d, (counts.get(d) || 0) + 1);
              items.push({ query: queryText, provider: p, answer, sources, domains });
              endLog(logId, { success: true, response: JSON.stringify({ answer, sources, domains }) });
            } catch (e) {
              items.push({ query: queryText, provider: p, error: String(e), answer: '', sources: [], domains: [] });
              try { if (logId) endLog(logId, { success: false, error: e }); } catch {}
            }
          } else {
            // 普通模型处理（无来源追踪）
            let content = '';
            try {
              content = await chat([
                { role: 'system', content: '你是GEO引用分析助手，返回简洁回答。' },
                { role: 'user', content: queryText },
              ], { provider: p, op: 'analyze_sources', query: queryText, model: (PROVIDERS[p] && typeof PROVIDERS[p].model === 'function') ? PROVIDERS[p].model() : undefined });
            } catch {}
            const domains = extractDomains(content);
            for (const d of domains) counts.set(d, (counts.get(d) || 0) + 1);
            items.push({ query: queryText, provider: p, answer: content, sources: [], domains });
          }
        })());
      }
    }
  await Promise.allSettled(tasks);
  const domainList = Array.from(counts.entries()).map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count);
  res.json({ domains: domainList, items });
}
