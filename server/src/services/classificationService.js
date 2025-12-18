import { chat } from '../qwen.js';
import { parseLoose } from '../utils/common.js';

/**
 * 根据品牌名称获取品类
 * 使用LLM进行智能分类
 * 
 * @param {string} brand - 品牌名称
 * @returns {Promise<string>} - 品类名称
 */
export async function getCategoryByBrand(brand) {
  const b = String(brand || '').trim();
  if (!b) return '';
  const prompt = `请仅根据品牌名判断所属品类，只能选择其一：汽车、B2B工业/SaaS、医疗健康、金融理财、3C数码、家电、户外装备、功能性护肤品、定制旅游路线、装修设计风格、小众香水、高客单价餐厅、医美诊所、私教健身房、律所/咨询服务、其他。只返回JSON：{category:"..."}`;
  try {
    const j = await chat([
      { role: 'system', content: '你是GEO系统的分类器与画像分析器。' },
      { role: 'user', content: `${prompt}\n输入（品牌名）：${b}\n只返回合法JSON，不要添加任何说明。` },
    ], { op: 'decode_category', query: b });
    const parsed = parseLoose(j);
    return String(parsed?.category || '');
  } catch {
    return '';
  }
}

/**
 * 根据品类获取渠道策略
 * 将品类映射到A/B/C/D四种GEO策略模型
 * 
 * @param {string} category - 品类名称
 * @returns {string} - 渠道代码 (A|B|C|D|'')
 */
export function getChannelByCategory(category) {
  const c = String(category || '').trim();
  if (!c) return '';
  const A = ['汽车','B2B工业/SaaS','医疗健康','金融理财'];
  const B = ['3C数码','家电','户外装备'];
  const C = ['功能性护肤品','定制旅游路线','装修设计风格','小众香水'];
  const D = ['高客单价餐厅','医美诊所','私教健身房','律所/咨询服务'];
  if (A.includes(c)) return 'A';
  if (B.includes(c)) return 'B';
  if (C.includes(c)) return 'C';
  if (D.includes(c)) return 'D';
  return '';
}
