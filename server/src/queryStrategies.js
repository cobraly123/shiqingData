/**
 * Query 生成策略上下文构建器
 * 目标：为不同框架/维度/角度构建更细粒度的提示上下文，指导 LLM 或本地生成器产出更贴近用户意图的 Query。
 */

import { trustFramework, specsFramework, lifestyleFramework, localFramework } from './frameworks.js'

export function getStrategyContext(channel, dimensionKey, angle, topic) {
  /**
   * 算法说明：
   * 1) 根据通道选择框架对象；
   * 2) 读取维度的内容策略（funnel/intent/content/tactics/keywords）；
   * 3) 组合为高密度提示上下文，强调“结论前置/证据引用/参数结构化/场景切割”等核心动作；
   * 4) 将 angle 作为切角约束，确保 Query 口语化且围绕该切角。
   */
  const fw = channel === 'A'
    ? trustFramework()
    : channel === 'B'
    ? specsFramework()
    : channel === 'C'
    ? lifestyleFramework()
    : channel === 'D'
    ? localFramework()
    : trustFramework()
  const dim = fw.dimensions?.[dimensionKey]
  const ctx = {
    framework: fw.name,
    funnel: dim?.funnel || 'Unknown',
    angle,
    topic,
    intentExplicit: dim?.intent?.explicit || '',
    intentImplicit: dim?.intent?.implicit || '',
    strategy: dim?.content?.strategy || '',
    logic: dim?.content?.logic || '',
    tactics: dim?.content?.tactics || [],
    keywords: dim?.content?.keywords || [],
  }
  return ctx
}

export function renderSystemPrompt(ctx) {
  /**
   * 系统提示构建：将策略上下文转为指导性描述，帮助模型生成更符合维度关注点的 Query。
   */
  const tactics = (ctx.tactics || []).map(t => `- ${t}`).join('\n')
  const kw = (ctx.keywords || []).join('、')
  return [
    `你是GEO优化专家，熟悉“${ctx.framework}”框架的查询挖掘。`,
    `漏斗阶段：${ctx.funnel}；切角：${ctx.angle}；主题：${ctx.topic}`,
    `用户显性意图：${ctx.intentExplicit}`,
    `用户隐性意图：${ctx.intentImplicit}`,
    `内容策略：${ctx.strategy}；核心逻辑：${ctx.logic}`,
    `执行要点：\n${tactics}`,
    `高频关键词（共现）：${kw}`,
    `输出要求：生成5条口语化具体Query，避免学术术语；每条紧扣切角；用换行分隔，不要编号。`,
  ].join('\n')
}
