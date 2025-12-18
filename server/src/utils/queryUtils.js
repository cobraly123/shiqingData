/**
 * 组合种子关键词
 * 将分类和种子关键词组合成搜索词
 * 
 * @param {string} cat - 分类
 * @param {string} seed - 种子关键词
 * @returns {string} 组合后的搜索词
 */
export function combineSeed(cat, seed) {
  const c = String(cat || '').trim();
  const s = String(seed || '').trim();
  if (!c && !s) return '';
  if (!c) return s;
  if (!s) return c;
  return `${c} ${s}`;
}

/**
 * 确保查询词质量
 * 清理多余空格和格式
 * 
 * @param {string} q - 原始查询词
 * @param {string} cat - 分类 (未使用)
 * @param {string} prod - 产品 (未使用)
 * @returns {string} 清理后的查询词
 */
export function ensureQuality(q, cat, prod) {
  let s = String(q || '').replace(/[\u3000\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  // const c = String(cat || '').trim(); // unused in original code
  // const p = String(prod || '').trim(); // unused in original code
  // const esc = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  s = s.replace(/\s{2,}/g, ' ').trim();
  //if (s.length > 30) s = s.slice(0, 30);
  return s;
}

/**
 * 推测维度键
 * 根据给定的角度反推其所属的维度键
 * 
 * @param {Object} framework - 策略框架对象
 * @param {string} angle - 角度名称
 * @returns {string} 维度键
 */
export function guessDimensionKey(framework, angle) {
  /**
   * 简单规则：在框架的维度中查找包含该切角的维度；找不到则回退Benchmark。
   */
  const dims = framework.dimensions || {};
  for (const [k, v] of Object.entries(dims)) {
    if (v.content?.angles?.includes(angle)) return k;
  }
  return Object.keys(dims)[0] || 'Benchmark';
}
