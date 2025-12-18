import { InputSchema } from '../schemas/index.js';
import { DIMENSION_MAP } from '../config.js';
import { detectSignals } from '../intent.js';
import { chat } from '../qwen.js';
import { parseLoose } from '../utils/common.js';
import { getCategoryByBrand, getChannelByCategory } from '../services/classificationService.js';

/**
 * 解码控制器
 * 处理品牌/产品解码，确定分类、画像和维度
 * 
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
export async function decode(req, res) {
  // 验证输入
  const input = InputSchema.parse(req.body);
  const personaPrompt = `基于用户输入，推导心态画像标签（如：#怀疑智商税、#急需止痛、#纠结性价比），以及可能的竞品锚点（如：蒙脱石散、佳能R6）。只返回JSON：{persona:[...], competitors:[...]}`;
  const classifyPrompt = `请仅根据品牌名判断所属的GEO策略模型（A高信任/B极客/C生活方式/D本地/E直答）。只返回JSON：{channel:"A|B|C|D|E", reason:"..."}`;
  
  let persona = { persona: [], competitors: [] };
  let classify = { channel: 'C', reason: 'fallback' };
  
  // 尝试获取用户画像
  try {
    const personaJson = await chat([
      { role: 'system', content: '你是GEO系统的分类器与画像分析器。' },
      { role: 'user', content: `${personaPrompt}\n输入：${JSON.stringify(input)}\n只返回合法JSON，不要添加任何说明。` },
    ], { op: 'decode_persona', query: input.userQuery || input.seedKeyword });
    persona = parseLoose(personaJson) || persona;
  } catch {}
  
  const brandOnly = String(input.brand || input.product || '').trim();
  // 尝试通过品牌获取分类
  const cat1 = await getCategoryByBrand(brandOnly);
  
  if (cat1) {
    const ch1 = getChannelByCategory(cat1);
    if (ch1) {
      // 命中预设分类规则
      classify = { channel: ch1, reason: 'llm-category' };
    } else {
      // LLM分类兜底
      try {
        const classifyJson = await chat([
          { role: 'system', content: '你是GEO系统的分类器与画像分析器。' },
          { role: 'user', content: `${classifyPrompt}\n输入（品牌名）：${brandOnly}\n只返回合法JSON，不要添加任何说明。` },
        ], { op: 'decode_classify', query: brandOnly });
        classify = parseLoose(classifyJson) || classify;
      } catch {}
      if (!classify.channel) classify = { channel: 'E', reason: 'fallback' };
    }
  } else {
    // 完全LLM分类兜底
    try {
      const classifyJson = await chat([
        { role: 'system', content: '你是GEO系统的分类器与画像分析器。' },
        { role: 'user', content: `${classifyPrompt}\n输入（品牌名）：${brandOnly}\n只返回合法JSON，不要添加任何说明。` },
      ], { op: 'decode_classify', query: brandOnly });
      classify = parseLoose(classifyJson) || classify;
    } catch {}
    if (!classify.channel) classify = { channel: 'E', reason: 'fallback' };
  }
  
  // 信号检测
  const signals = await detectSignals(input);
  const channel = classify.channel;
  const modelMeta = DIMENSION_MAP[channel] || DIMENSION_MAP.E;
  
  res.json({
    input,
    channel,
    channelName: modelMeta.name,
    category: cat1 || '',
    persona,
    reasoning: classify.reason,
    dimensions: modelMeta.dimensions,
    signals,
    expandedSeeds: signals.expandedSeeds,
  });
}
