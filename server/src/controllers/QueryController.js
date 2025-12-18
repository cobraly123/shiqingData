import { MineQueriesSchema, ExpandMatrixSchema, GraphSchema, ScoreQueriesSchema } from '../schemas/index.js';
import { DIMENSION_MAP } from '../config.js';
import { chat, generateCategoryFirstQueries, generateGeekQueries, generateLifestyleQueries, generateLocalQueries, generateQueries, scoreQuerySimAsync } from '../qwen.js';
import { parseLoose } from '../utils/common.js';
import { getFrameworkByChannel, getDiamondSubAngles } from '../frameworks.js';
import { getStrategyContext, renderSystemPrompt } from '../queryStrategies.js';
import { getLogs } from '../monitor.js';
import { combineSeed, ensureQuality, guessDimensionKey } from '../utils/queryUtils.js';

/**
 * 挖掘查询词
 * 根据品牌、品类和策略生成相关的查询词
 */
export async function mineQueries(req, res) {
  // 验证请求体
  const { product, brand, seedKeyword, channel, signals, direct } = MineQueriesSchema.parse(req.body);
  let category = '';
  const brandOnly = String(brand || product || '').trim();
  console.log('mine-queries request', { product, brand, seedKeyword, channel });
  
  let classificationError = '';
  try {
    // 尝试通过LLM获取品牌分类
    const classifyJson = await chat([
      {
        role: 'system',
        content: '你是GEO系统的分类器与画像分析器。请根据提供的品牌名称直接返回最相关的产品品类分类。'
      },
      {
        role: 'user',
        content: `请为以下品牌确定最相关的产品品类：\n品牌名称： ${brandOnly}\n只返回合法JSON格式的品类名称，不要添加任何说明文字。`
      }
    ], {
      op: 'decode_classify',
      query: brandOnly
    });
    console.log('mine-queries classifyJson', classifyJson);
    const parsed = parseLoose(classifyJson);
    const refined = String((parsed?.category ?? parsed?.['品类'] ?? parsed?.['类别'] ?? parsed?.['类目'] ?? parsed?.['品类名称'] ?? '')).trim();
    console.log('mine-queries parsed', parsed);
    console.log('mine-queries refined', refined);
    category = refined;
    console.log('mine-queries category', category);
  } catch (e) {
    classificationError = String(e || 'classification_failed');
  }
  console.log('mine-queries classify', { brand: brandOnly, category: category, error: classificationError });

  // 确定维度角度
  const meta = DIMENSION_MAP[channel] || DIMENSION_MAP.E;
  let angles = Object.values(meta.dimensions).flat();
  if (signals?.intentType === '比较与评估型') {
    // union A.Comp angles for richer对比
    const compAngles = DIMENSION_MAP.A.dimensions.Comp;
    angles = Array.from(new Set([...(angles || []), ...(compAngles || [])]));
  }
  const productTerm = product;
  const results = [];
  const framework = getFrameworkByChannel(channel);
  
  // 遍历所有角度生成查询词
  for (const angle of angles) {
    // 尝试根据角度推测维度键
    const dimensionKey = guessDimensionKey(framework, angle);
    const ctx = getStrategyContext(channel, dimensionKey, angle, `${productTerm}/${seedKeyword}`);
    const systemPrompt = renderSystemPrompt(ctx);
    let qsRaw = [];
    const combinedSeed = combineSeed(category, seedKeyword);
    console.log('mine-queries combineSeed', { category: category, seedKeyword, combinedSeed }); 
    
    // 根据渠道类型选择不同的生成策略
    if (channel === 'A') {
      qsRaw = await generateCategoryFirstQueries(combinedSeed, angle, 2);
    } else if (channel === 'B') {
      qsRaw = await generateGeekQueries(combinedSeed, angle, 2);
    } else if (channel === 'C') {
      qsRaw = await generateLifestyleQueries(combinedSeed, angle, 2);
    } else if (channel === 'D') {
      qsRaw = await generateLocalQueries(combinedSeed, angle, 2);
    } else {
      qsRaw = await generateQueries(productTerm, combinedSeed, angle, 2, { systemPrompt });
    }
    
    // 过滤和清理生成的查询词
    let qs = qsRaw;
    qs = qs.map(q => ensureQuality(q, category, productTerm)).filter(q => {
      const len = String(q || '').length;
      return len >= 10;
    });
    for (let q of qs) {
      results.push({ query: q, angle });
    }
  }
  res.json({ list: results, meta: { brand: brandOnly, category } });
}

/**
 * 测试策略
 * 生成特定策略下的系统提示词和示例
 */
export async function testStrategy(req, res) {
  const product = String(req.query.product || '产品');
  const seedKeyword = String(req.query.seedKeyword || '关键词');
  const channel = String(req.query.channel || 'A');
  const limit = Math.max(1, Math.min(6, Number.parseInt(String(req.query.limit || '4'), 10) || 4));
  const framework = getFrameworkByChannel(channel);
  const combined = String(req.query.combined || '0') === '1';
  const samples = [];
  
  if (combined) {
    // 组合模式
    const diamond = getDiamondSubAngles(channel);
    for (const [dimensionKey, def] of Object.entries(diamond.dimensions || {})) {
      for (const sa of (def.subAngles || [])) {
        const ctx = getStrategyContext(channel, dimensionKey, sa.name, `${product}/${seedKeyword}`);
        const systemPrompt = renderSystemPrompt(ctx);
        samples.push({ angle: sa.name, axis: sa.axis, tag: sa.tag, dimensionKey, systemPromptSnippet: systemPrompt.slice(0, 260) });
      }
    }
    res.json({ channel, framework: framework.name, product, seedKeyword, combined: true, samples: samples.slice(0, limit) });
  } else {
    // 普通模式
    const meta = DIMENSION_MAP[channel] || DIMENSION_MAP.E;
    const angles = Object.values(meta.dimensions).flat().slice(0, limit);
    for (const angle of angles) {
      const dimensionKey = guessDimensionKey(framework, angle);
      const ctx = getStrategyContext(channel, dimensionKey, angle, `${product}/${seedKeyword}`);
      const systemPrompt = renderSystemPrompt(ctx);
      samples.push({ angle, dimensionKey, systemPromptSnippet: systemPrompt.slice(0, 260) });
    }
    res.json({ channel, framework: framework.name, product, seedKeyword, samples });
  }
}

/**
 * 扩展矩阵
 * 占位函数，当前仅返回默认状态
 */
export async function expandMatrix(req, res) {
  const { items, dimensionStrategy, evidence, tone } = ExpandMatrixSchema.parse(req.body);
  const outputs = [];
  for (const item of items) {
    /* 注释：根据需求，暂不将 Query 送至大模型进行提问
    const html = await answerQuery(dimensionStrategy, evidence, tone, item.query);
    outputs.push({ ...item, html });
    */
    outputs.push({ ...item, html: '', answered: false, skipped: true });
  }
  res.json({ outputs });
}

/**
 * 生成图谱数据
 * 构建产品、维度、角度和查询词的关系图
 */
export async function graph(req, res) {
  const { product, brand, usp, seedKeyword, mined } = GraphSchema.parse(req.body);
  const nodes = [];
  const links = [];
  const rootId = `product:${product}`;
  
  // 添加根节点（产品）
  nodes.push({ id: rootId, label: product, type: 'Product', brand, usp });
  const dims = new Map();
  const anglesByDim = new Map();
  
  for (const item of mined || []) {
    const dName = item.dimension || 'Unknown';
    if (!dims.has(dName)) {
      // 添加维度节点
      const id = `dim:${dName}`;
      dims.set(dName, id);
      nodes.push({ id, label: dName, type: 'GEO_Dimension' });
      links.push({ source: rootId, target: id, type: 'EXPANDS_TO' });
      anglesByDim.set(dName, new Map());
    }
    const dimId = dims.get(dName);
    const angleMap = anglesByDim.get(dName);
    if (!angleMap.has(item.angle)) {
      // 添加角度节点
      const aId = `angle:${dName}:${item.angle}`;
      angleMap.set(item.angle, aId);
      nodes.push({ id: aId, label: item.angle, type: 'Angle' });
      links.push({ source: dimId, target: aId, type: 'HAS_ANGLE' });
    }
    const aId = angleMap.get(item.angle);
    const qId = `q:${item.query}`;
    // 添加查询词节点
    nodes.push({ id: qId, label: item.query, type: 'User_Query', angle: item.angle, score: item.score?.total, volume: item.volume || 'Medium', answered: Boolean(item.html) });
    links.push({ source: aId, target: qId, type: 'CAPTURES_INTENT' });
  }
  res.json({ nodes, links });
}

/**
 * 查询词评分
 * 对生成的查询词与维度的相关性进行评分
 */
export async function scoreQueries(req, res) {
  const { items } = ScoreQueriesSchema.parse(req.body);
  const out = [];
  for (const it of items) {
    const q = String(it.query || '');
    const angle = String(it.angle || '');
    const dim = String(it.dimension || it.dimensionKey || '');
    const score = await scoreQuerySimAsync(q, angle, dim);
    out.push({ query: q, angle, dimension: dim, score });
  }
  res.json({ list: out });
}

/**
 * 测试生成分类查询词
 * 调试接口
 */
export async function testGenerateCategoryQueries(req, res) {
  const seedKeyword = String(req.query.seedKeyword || '安全');
  const angle = String(req.query.angle || '专家与权威角');
  const count = Math.max(1, Math.min(10, Number.parseInt(String(req.query.count || '3'), 10) || 3));
  const parsed = await generateCategoryFirstQueries(seedKeyword, angle, count);
  const recent = getLogs(200).filter(l => String(l.operation || '') === 'generateCategoryFirstQueries' && String(l.query || '') === `angle=${angle}|seed=${seedKeyword}`);
  const content = String((recent[0] && recent[0].response) || '');
  res.json({ seedKeyword, angle, count, content, parsed });
}
