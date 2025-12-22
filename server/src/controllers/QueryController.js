import { MineQueriesSchema, ExpandMatrixSchema, GraphSchema, ScoreQueriesSchema, GenerateGeoQuestionsSchema } from '../schemas/index.js';
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
    
    // 如果是 GEO 策略生成的高频问题，直接评为 100 分
    if (dim === '高频' || angle === '高频') {
      console.log(`[Score] Skipping LLM for GEO question: ${q}, assigning 100.`);
      out.push({ 
        query: q, 
        angle, 
        dimension: dim, 
        score: { 
          total: 100, 
          realism: 30, 
          demand: 20, 
          habit: 20, 
          align: 30, 
          reason: 'GEO策略生成的高频问题，默认满分' 
        } 
      });
      continue;
    }

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

/**
 * 生成GEO问题
 * 根据品牌、关键词及策略逻辑生成15-20个问题
 */
export async function generateGeoQuestions(req, res) {
  const { brand, keyword, industry, competitor, scenario } = GenerateGeoQuestionsSchema.parse(req.body);

  const systemPrompt = `你是资深GEO（Generative Engine Optimization）专家。你的任务是根据给定的品牌和核心词，按照特定的策略逻辑生成15-20个针对搜索引擎优化的中文问题。

策略逻辑框架：[目标维度] × [变量注入] × [语法结构] = GEO 问题

步骤说明：
1. **拓展输入变量**：
   - 品牌 (Brand): ${brand}
   - 核心词 (Keyword): ${keyword}
   - 行业 (Industry): ${industry || '请根据品牌和核心词推断'}
   - 竞品 (Competitor): ${competitor || '请根据行业推断1-2个主要竞品'}
   - 场景 (Scenario): ${scenario || '请根据核心词推断具体的应用场景'}

2. **映射策略维度** (生成覆盖以下5个维度的问题)：
   a. **行业占位**: 建立“品牌 = 行业代表”的等式。模板：“在{Industry}领域，哪些品牌在{Keyword}方面最具有代表性？”
   b. **需求场景**: 将品牌植入用户具体的搜索意图。模板：“在执行{Scenario}时，如何选择能提供优质{Keyword}的服务商？”
   c. **口碑对冲**: 引导总结正面评价。模板：“用户对{Industry}的{Keyword}评价中，最常被提及的优势有哪些？”
   d. **竞品对比**: 突出差异化优势。模板：“在{Industry}中，在处理{Keyword}问题时谁的方案更优（对比{Competitor}）？”
   e. **权威背书**: 模拟第三方视角。模板：“根据最新的{Industry}评测或榜单，哪些品牌在{Keyword}维度表现最稳？”

3. **增加修饰算子** (应用到上述生成的问题中)：
   A. **语义泛化**: 使用核心词的上位词或近义词替换部分“{Keyword}”或“{Scenario}”。
   B. **时效性**: 在部分问题中加入“2025年”、“最新的”、“当前”等时间戳。
   C. **意图颗粒化**: 将问题细化为“怎么选”、“多少钱”、“避坑指南”、“排行榜”等。

输出要求：
- 仅输出一个JSON字符串数组，不要包含Markdown格式或其他文字说明。
- 数组包含15-20个高质量的GEO问题。
- 问题必须自然、口语化且符合搜索习惯。
`;

  const userPrompt = `请生成针对品牌“${brand}”和核心词“${keyword}”的GEO问题列表。`;

  try {
    const content = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { op: 'generateGeoQuestions', query: `${brand}-${keyword}` });

    let questions = [];
    try {
        // 尝试解析JSON
        const cleaned = content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        const parsed = JSON.parse(cleaned);
        
        if (Array.isArray(parsed)) {
            // Ensure all items are strings
            questions = parsed.map(item => {
                if (typeof item === 'string') return item;
                if (typeof item === 'object' && item !== null) {
                    // Try to extract text from common keys or values
                    return item.question || item.content || item.query || item.text || Object.values(item)[0] || String(item);
                }
                return String(item);
            });
        } else if (typeof parsed === 'object' && parsed !== null) {
            // If it returned a single object wrapping the list
            if (Array.isArray(parsed.questions)) {
                questions = parsed.questions.map(q => typeof q === 'string' ? q : (q.question || String(q)));
            } else {
                 // Last resort: treat values as questions if they look like strings
                 questions = Object.values(parsed).filter(v => typeof v === 'string');
            }
        }
    } catch (e) {
        // 如果解析失败，尝试按行分割
        questions = content.split('\n').map(q => q.trim().replace(/^\d+\.\s*/, '')).filter(q => q.length > 5);
    }

    res.json({ brand, keyword, count: questions.length, questions });
  } catch (error) {
    console.error('generateGeoQuestions error', error);
    res.status(500).json({ error: 'Failed to generate questions', details: String(error) });
  }
}
