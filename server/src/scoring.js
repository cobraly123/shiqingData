/**
 * GEO-UserSim 仿真度评分模型（满分100，及格线75）
 * 维度与权重：
 * - 拟人真实度(Anthropic Realism) 40%
 * - 需求普适性(Demand Probability) 30%
 * - 搜索习惯匹配度(Search Habit Fit) 30%
 * 算法思路：基于启发式特征与正则规则对 Query 进行打分，可在未来替换为模型评分。
 */

const W = { realism: 0.4, demand: 0.3, habit: 0.3 };

function scoreRealism(q) {
  // 规则：短句、口语化、含疑问或判断词，避免术语堆砌
  const len = q.length;
  const short = len <= 24 ? 1 : len <= 48 ? 0.8 : 0.6;
  const colloquial = /(吗|咋|到底|真的|会不会|靠谱吗|值不值)/.test(q) ? 1 : 0.7;
  const question = /[?？]|(vs|PK|哪个好)/i.test(q) ? 1 : 0.8;
  const jargonPenalty = /(阐述|效能|性能参数说明|综述)/.test(q) ? 0.6 : 1;
  return Math.round(40 * short * colloquial * question * jargonPenalty);
}

function scoreDemand(q) {
  // 规则：安全、价格、副作用、品牌对比等高频痛点加分，偏僻细节降分
  const highFreq = /(安全|价格|副作用|对比|售后|保值|续航|自燃|碰撞|AEB|气囊)/.test(q) ? 1 : 0.7;
  const nichePenalty = /(产地|胶囊壳|螺丝规格|色号编号)/.test(q) ? 0.6 : 1;
  return Math.round(30 * highFreq * nichePenalty);
}

function scoreHabit(q) {
  // 规则：品牌+关键词、XX vs XX、避免长句寒暄、避免多从句
  const brandKeyword = /[\u4e00-\u9fa5A-Za-z0-9]+\s*(vs|VS|对比)\s*[\u4e00-\u9fa5A-Za-z0-9]+/.test(q) || /[\u4e00-\u9fa5A-Za-z0-9]+\s*(安全|价格|续航)/.test(q);
  const notGreeting = !/(你好|请问)/.test(q);
  const clauses = q.split(/，|,|；|;|。/).length;
  const clausePenalty = clauses > 3 ? 0.7 : 1;
  const base = 30 * (brandKeyword ? 1 : 0.8) * (notGreeting ? 1 : 0.7) * clausePenalty;
  return Math.round(base);
}

export function userSimScore(q) {
  const realism = scoreRealism(q);
  const demand = scoreDemand(q);
  const habit = scoreHabit(q);
  const total = Math.round(realism + demand + habit);
  return { realism, demand, habit, total };
}

/**
 * 评分聚合器（可自定义权重）
 */
export function aggregateScore(parts, weights = W) {
  const total = Math.round(parts.realism * (weights.realism / 0.4) + parts.demand * (weights.demand / 0.3) + parts.habit * (weights.habit / 0.3));
  return { ...parts, total };
}

