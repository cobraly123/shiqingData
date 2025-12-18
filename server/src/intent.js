import { chat } from './qwen.js';

const cmpPatterns = [/(vs|VS|对比|比较|区别|哪个好|哪款好|评测|横评|PK)/i];
const planPatterns = [/(如何|怎么|步骤|攻略|计划|方案|SOP)/i];
const buyPatterns = [/(推荐|价格|哪里买|购买|渠道|折扣|优惠)/i];
const categoryPatterns = [/(新能源|新能|电动车|纯电|增程|混动|插混)/i];

function pickByRules(text) {
  if (cmpPatterns.some((re) => re.test(text))) return '比较与评估型';
  if (planPatterns.some((re) => re.test(text))) return '复杂规划与建议型';
  if (buyPatterns.some((re) => re.test(text))) return '交易辅助型';
  return '事实检索型';
}

function parseLoose(jsonStr) {
  try { return JSON.parse(jsonStr); } catch {}
  const m = String(jsonStr || '').match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

export async function detectSignals({ product = '', seedKeyword = '', userQuery = '' }) {
  const text = [product, seedKeyword, userQuery].join(' ').trim();
  let intentType = '';
  let source = 'fallback';
  try {
    const personaPrompt = '请判断用户意图类型，只能从以下四类中选择其一：事实检索型、比较与评估型、复杂规划与建议型、交易辅助型。只返回JSON：{"intentType":"..."}';
    const j = await chat([
      { role: 'system', content: '你是GEO系统的用户意图分类器。' },
      { role: 'user', content: `${personaPrompt}\n输入：${text}` },
    ], { op: 'intent_detect', query: seedKeyword || userQuery || product });
    const parsed = parseLoose(j);
    console.log('detectSignals LLM raw:', j);
    console.log('detectSignals LLM parsed:', parsed);
    if (parsed && typeof parsed.intentType === 'string' && parsed.intentType.length) {
      intentType = parsed.intentType;
      source = 'llm';
    }
  } catch {}
  if (!intentType) intentType = pickByRules(text);
  const comparative = cmpPatterns.some((re) => re.test(text));
  const categorySafety = /安全|安全性|碰撞|事故|刹车|气囊|AEB|电池|自燃/i.test(text) && categoryPatterns.some((re) => re.test(text));
  const vs = /(vs|VS|对比|比较|PK)/i.test(text);
  const entities = [];
  if (vs) {
    const parts = String(userQuery || text).split(/vs|VS|对比|比较|PK/).map((s) => s.trim()).filter(Boolean);
    entities.push(...parts);
  }
  const expandedSeeds = [];
  if (/安全/i.test(text)) expandedSeeds.push('安全性', '主动安全', '碰撞测试', 'AEB', '气囊', '电池安全');
  if (categoryPatterns.some((re) => re.test(text))) expandedSeeds.push('新能源车', '纯电SUV', '插混SUV', '增程式');
  const rationale = source === 'llm' ? 'LLM分类' : '规则兜底分类';
  return { intentType, source, comparative, categorySafety, vs, entities, expandedSeeds, rationale };
}
