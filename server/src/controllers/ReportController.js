import { EvalQueriesSchema, ReportCreateSchema, AnalyzeSourcesSchema } from '../schemas/index.js';
import { uid, extractDomains } from '../utils/common.js';
import { chat } from '../qwen.js';
import { PROVIDERS } from '../llm/providers.js';
import { callWenxinDetailed, callQwenDeepResearchDetailed } from '../llm/index.js';
import { startLog, endLog } from '../monitor.js';
import { getTask, setTask } from '../services/reportService.js';
import { automationService } from '../services/AutomationService.js';
import { extractBrandsFromText, analyzeQueryResponse } from '../services/analysisService.js';

/**
 * 辅助函数：从响应对象中提取文本内容
 */
function getResponseText(response) {
  if (response === null || response === undefined) return '';
  if (typeof response === 'string') return response;
  
  if (typeof response === 'object') {
      // 优先尝试 text 或 content 字段
      const candidate = response.text || response.content;
      if (typeof candidate === 'string') return candidate;
      
      // 处理嵌套对象
      if (candidate && typeof candidate === 'object') {
          return getResponseText(candidate);
      }
      
      // 兜底：转为 JSON 字符串
      try {
          return JSON.stringify(response);
      } catch (e) {
          return '[Object]';
      }
  }
  return String(response);
}

/**
 * 执行竞品分析的辅助函数
 */
async function performCompetitorAnalysis(state, id) {
  try {
    console.log(`[Report ${id}] Starting advanced competitor analysis (Force Mode)...`);
    
    // 准备目标品牌：用户输入的 + 之前自动发现的(如果有)
    const targetBrands = state.input.competitors || [];
    
    // 获取本轮覆盖的模型和问题统计
    const allResults = state.results || [];
    const providers = [...new Set(allResults.map(r => r.provider))];
    const queries = [...new Set(allResults.map(r => r.query))];
    console.log(`[Report ${id}] Scope: ${allResults.length} responses from ${providers.length} models (${providers.join(', ')}) on ${queries.length} queries.`);

    // 筛选出所有需要分析的结果（包括之前分析失败的，或者尚未分析的）
    // 只要有响应内容（即使很短），都进行分析，确保“每个回复都进行分析”
    const tasks = allResults.filter(r => {
        const text = getResponseText(r.response);
        // 只要成功且有内容（非空字符串），就纳入分析
        // 如果已经有分析结果且包含 extractedBrands，则跳过（避免重复）
        const hasValidAnalysis = r.analysis && r.analysis.extractedBrands;
        return r.success && text && text.trim().length > 0 && !hasValidAnalysis;
    });

    console.log(`[Report ${id}] Pending analysis tasks: ${tasks.length}`);

    // 分批处理分析任务
    // 降低并发度以避免 QPS 限制 (Qwen API 限制)
    const batchSize = 2;
    
    for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        console.log(`[Report ${id}] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tasks.length/batchSize)}...`);
        
        await Promise.all(batch.map(async (r) => {
            try {
                const text = getResponseText(r.response);
                console.log(`[Report ${id}] Analyzing response from ${r.provider} (Length: ${text.length})...`);
                
                // 调用分析服务
                const analysis = await analyzeQueryResponse(text, targetBrands);
                
                // 记录分析结果
                r.analysis = analysis;
                r.isAnalyzed = true; // 标记已分析
                
            } catch (e) {
                console.error(`Analysis failed for query: ${r.query} (${r.provider})`, e);
                // 记录失败状态，避免下次被误判为未处理（或者根据需求决定是否重试）
                r.analysis = { 
                    error: String(e), 
                    extractedBrands: [], 
                    matchResults: [],
                    densityAnalysis: { brandCount: 0, textLength: 0, density: 0 },
                    scoring: { totalScore: 0, brandSequenceScore: 0 }
                };
                r.isAnalyzed = false; // 标记未成功分析
            }
        }));

        // 批次间增加延时，缓解 API 压力
        if (i + batchSize < tasks.length) {
            await new Promise(resolve => setTimeout(resolve, 1500)); // 增加到1.5秒
        }
    }

    // 汇总分析 (重新计算所有结果的统计信息)
    const brandStats = new Map(); // brand -> { count, totalRank, ranks: [] }
    
    state.results.forEach(r => {
        if (r.analysis && Array.isArray(r.analysis.extractedBrands)) {
            r.analysis.extractedBrands.forEach((brand, index) => {
                if (!brandStats.has(brand)) {
                    brandStats.set(brand, { count: 0, totalRank: 0, ranks: [] });
                }
                const stats = brandStats.get(brand);
                stats.count += 1;
                stats.ranks.push(index + 1); // 1-based rank
                stats.totalRank += (index + 1);
            });
        }
    });

    // 转换为数组并排序
    const summary = Array.from(brandStats.entries()).map(([brand, stats]) => ({
        brand,
        count: stats.count,
        avgRank: (stats.totalRank / stats.count).toFixed(2),
        minRank: Math.min(...stats.ranks),
        maxRank: Math.max(...stats.ranks)
    }));

    // 排序规则：出现次数倒序，其次平均排名升序
    summary.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return parseFloat(a.avgRank) - parseFloat(b.avgRank);
    });

    state.competitorAnalysis = {
        summary,
        timestamp: new Date().toISOString()
    };
    
    console.log(`[Report ${id}] Competitor analysis completed. Found ${summary.length} brands.`);

  } catch (err) {
    console.error(`[Report ${id}] Auto competitor analysis failed:`, err);
  }
}

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
  const { queries, providers, product, brand, seedKeyword, sellingPoints, mode } = ReportCreateSchema.parse(req.body);
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
    if (mode === 'automation') {
       try {
         await automationService.batchRun(queries, providers, {
           retryCount: 3,
           onProgress: ({ completed, total, lastResult }) => {
             state.progress.done = completed;
             state.progress.total = total;
             state.progress.percent = total ? Math.round((completed / total) * 100) : 100;
             if (lastResult) {
               state.results.push({
                 ...lastResult,
                 provider: lastResult.platform,
                 success: lastResult.status === 'success'
               });
             }
           }
         });
         
         // 自动执行竞品分析
         await performCompetitorAnalysis(state, id);

         state.status = 'completed';
       } catch (err) {
         console.error('Automation failed:', err);
         state.status = 'failed';
         state.error = err.message;
       }
    } else {
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

      // 自动执行竞品分析
      await performCompetitorAnalysis(state, id);

      state.status = 'completed';
    }
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

  // 补救措施：检查是否有未分析的有效结果
  const hasUnanalyzedResults = state.results.some(r => {
      const text = getResponseText(r.response);
      const hasValidAnalysis = r.analysis && (r.analysis.extractedBrands || r.analysis.error);
      return r.success && text && text.trim().length > 0 && !hasValidAnalysis;
  });

  // Debug output for user: Check all results status
  if (state.results.length > 0) {
      console.log(`--- REPORT ${id} RESULTS DEBUG ---`);
      state.results.forEach((r, idx) => {
          const text = getResponseText(r.response);
          const hasAnalysis = !!r.analysis;
          const brandCount = hasAnalysis && r.analysis.extractedBrands ? r.analysis.extractedBrands.length : 0;
          console.log(`[${idx + 1}] ${r.provider}: Success=${r.success}, Len=${text.length}, Analyzed=${hasAnalysis}, Brands=${brandCount}`);
          if (hasAnalysis && brandCount === 0) {
              console.log(`   -> Analysis exists but no brands found. Analysis keys: ${Object.keys(r.analysis).join(', ')}`);
          }
      });
      console.log('--------------------------------');
  }

  // 如果缺少竞品分析，或者发现有未分析的新结果，触发后台补跑
  if (state.status === 'completed' && (!state.competitorAnalysis || hasUnanalyzedResults) && state.results.length > 0) {
      console.log(`[Report ${id}] Triggering competitor analysis (missing or incomplete)...`);
      performCompetitorAnalysis(state, id).catch(err => console.error('Background analysis failed:', err));
  }

  res.json({ 
    id, 
    input: state.input, 
    queries: state.queries, 
    providers: state.providers, 
    results: state.results, 
    progress: state.progress, 
    status: state.status,
    competitorAnalysis: state.competitorAnalysis
  });
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

/**
 * 分析竞品
 * 使用LLM从文本中提取品牌名称
 */
export async function analyzeCompetitors(req, res) {
  const { text } = AnalyzeCompetitorsSchema.parse(req.body);

  try {
    const messages = [
      { 
        role: 'system', 
        content: `你是一个专业的品牌提取专家。请仔细阅读给定的文本，提取其中提到的所有商业品牌名称（Brand Names）。
要求：
1. 只提取明确的品牌名称（如：华为、小米、Keep、Garmin、荣耀等）。
2. 不要提取通用名词、形容词或产品类别（如：生态、品控、智能手环、运动手表等）。
3. 如果品牌有中文和英文名（如 Keep/Keep），请提取最常用的形式。
4. 返回结果必须是合法的JSON格式：{"brands": ["BrandA", "BrandB", ...]}。
5. 结果中不包含Markdown格式标记，只返回JSON字符串。` 
      },
      { role: 'user', content: text }
    ];

    const content = await chat(messages, {
      provider: 'qwen',
      op: 'analyze_competitors',
      model: process.env.QWEN_MODEL || 'qwen-plus'
    });

    let brands = [];
    try {
       // 尝试提取JSON部分
       const jsonMatch = content.match(/\{[\s\S]*\}/);
       const jsonStr = jsonMatch ? jsonMatch[0] : content;
       const data = JSON.parse(jsonStr);
       
       if (data && Array.isArray(data.brands)) {
         // 过滤掉非字符串和空字符串
         brands = data.brands.filter(b => typeof b === 'string' && b.trim().length > 0);
         // 去重
         brands = [...new Set(brands)];
       }
    } catch (e) {
      console.warn('Failed to parse LLM response for competitors:', content);
    }

    res.json({ brands });
  } catch (error) {
    console.error('Error in analyzeCompetitors:', error);
    res.status(500).json({ error: String(error) });
  }
}
