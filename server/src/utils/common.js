/**
 * 生成唯一ID
 * 结合随机数和时间戳
 * @returns {string} 唯一ID
 */
export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * 宽松解析JSON
 * 尝试解析JSON字符串，如果失败则尝试从文本中提取JSON对象
 * 
 * @param {string} jsonStr - JSON字符串
 * @returns {Object|null} 解析后的对象或null
 */
export function parseLoose(jsonStr) {
  try {
    return JSON.parse(jsonStr);
  } catch {
    const m = jsonStr.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch {}
    }
    return null;
  }
}

/**
 * 提取域名
 * 从文本中提取URL和域名
 * 
 * @param {string} text - 包含URL的文本
 * @returns {string[]} 域名列表
 */
export function extractDomains(text) {
  const set = new Set();
  const s = String(text || '');
  const urlRegex = /(https?:\/\/[^\s)\]\}<>"']+)/gi;
  const domRegex = /\b([a-zA-Z0-9.-]+\.(?:com|cn|net|org|io|co|gov|edu|info|top|biz|me))\b/gi;
  const add = (raw) => {
    try {
      const t = String(raw || '').trim();
      if (!t) return;
      let host = '';
      if (/^https?:\/\//i.test(t)) {
        try { host = new URL(t).hostname; } catch {}
      } else {
        host = t;
      }
      host = String(host || '').toLowerCase().replace(/^www\./, '');
      if (host) set.add(host);
    } catch {}
  };
  let m;
  while ((m = urlRegex.exec(s)) !== null) add(m[1]);
  while ((m = domRegex.exec(s)) !== null) add(m[1]);
  return Array.from(set);
}
